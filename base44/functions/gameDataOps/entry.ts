import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { DATA_ORIGINS, withProvenance } from '../_shared/provenance.ts';
import {
  HUMANITZ_CATALOG_VERSION,
  HUMANITZ_ITEM_CATALOG,
  HUMANITZ_RECIPE_CATALOG,
  HUMANITZ_SOURCE_MANIFEST,
} from '../_shared/generated/humanitzCatalog.ts';
import { LEGACY_STARTER_RECIPE_SLUGS } from '../_shared/recipeCatalog.ts';
import {
  buildCatalogLookup,
  buildInventorySnapshotFromCatalog,
  clampNumber,
  compactObject,
  ensureStructuredTradeOffer,
  ensureStructuredTradeRequest,
  findCatalogItem,
  sanitizeText,
} from '../_shared/catalogIdentity.mjs';
import {
  generateHumanitzCatalog,
  USER_AGENT,
  WIKI_GG_PAGES,
} from '../../../scripts/generate-humanitz-catalog.mjs';

const STATE_KEY = 'humanitz';
const RULE_VERSION_PREFIX = 'humanitz-catalog';
const LEGACY_SLUGS = new Set(LEGACY_STARTER_RECIPE_SLUGS);
const BACKFILL_LOCK_MS = 60 * 1000;
const DEFAULT_BACKFILL_CHUNK_SIZE = 40;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const action = sanitizeText(body?.action, 40) || 'bootstrap_catalog';

    if (action === 'ensure_catalog' || action === 'bootstrap_catalog') {
      const result = await bootstrapCatalog(base44);
      return Response.json({ status: 'ok', ...result });
    }

    if (action === 'get_status') {
      const state = await getCatalogStatus(base44);
      return Response.json({ status: 'ok', state });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (action === 'sync_snapshot') {
      const summary = await applyCatalogDataset(base44, {
        mode: 'snapshot',
        forceUpdate: true,
        dataset: {
          catalogVersion: HUMANITZ_CATALOG_VERSION,
          sourceManifest: HUMANITZ_SOURCE_MANIFEST,
          items: HUMANITZ_ITEM_CATALOG,
          recipes: HUMANITZ_RECIPE_CATALOG,
        },
      });

      return Response.json({ status: 'ok', ...summary, state: await getCatalogStatus(base44) });
    }

    if (action === 'sync_live') {
      const liveCatalog = await generateHumanitzCatalog({
        catalogVersion: new Date().toISOString(),
        fetchJsonImpl: fetchLiveCatalogJson,
        wikiPages: WIKI_GG_PAGES,
      });

      const summary = await applyCatalogDataset(base44, {
        mode: 'live',
        forceUpdate: true,
        dataset: liveCatalog,
      });

      return Response.json({ status: 'ok', ...summary, state: await getCatalogStatus(base44) });
    }

    if (action === 'backfill_references') {
      const chunkSize = clampNumber(body?.chunk_size, 1, 200, DEFAULT_BACKFILL_CHUNK_SIZE);
      const result = await runBackfillChunk(base44, { chunkSize, forceStart: true });
      return Response.json({ status: 'ok', ...result, state: await getCatalogStatus(base44) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('gameDataOps error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});

async function bootstrapCatalog(base44: any) {
  const state = await getOrCreateCatalogState(base44);
  const shouldApplySnapshot = sanitizeText(state.active_catalog_version, 80) !== HUMANITZ_CATALOG_VERSION
    || sanitizeText(state.snapshot_catalog_version, 80) !== HUMANITZ_CATALOG_VERSION
    || sanitizeText(state.active_sync_mode, 24) !== 'snapshot';

  const syncSummary = shouldApplySnapshot
    ? await applyCatalogDataset(base44, {
        mode: 'snapshot',
        forceUpdate: false,
        dataset: {
          catalogVersion: HUMANITZ_CATALOG_VERSION,
          sourceManifest: HUMANITZ_SOURCE_MANIFEST,
          items: HUMANITZ_ITEM_CATALOG,
          recipes: HUMANITZ_RECIPE_CATALOG,
        },
      })
    : null;

  const backfillSummary = await runBackfillChunk(base44, {
    chunkSize: DEFAULT_BACKFILL_CHUNK_SIZE,
    forceStart: false,
  });

  return {
    sync_summary: syncSummary,
    backfill_summary: backfillSummary,
    state: await getCatalogStatus(base44),
  };
}

async function applyCatalogDataset(base44: any, {
  mode,
  forceUpdate,
  dataset,
}: {
  mode: 'snapshot' | 'live';
  forceUpdate: boolean;
  dataset: {
    catalogVersion: string;
    sourceManifest: any[];
    items: any[];
    recipes: any[];
  };
}) {
  const catalogVersion = sanitizeText(dataset.catalogVersion, 80);
  const ruleVersion = `${RULE_VERSION_PREFIX}-${catalogVersion.slice(0, 10)}`;
  const [state, existingItems, existingRecipes] = await Promise.all([
    getOrCreateCatalogState(base44),
    base44.asServiceRole.entities.GameItem.filter({}, 'slug', 1000),
    base44.asServiceRole.entities.Recipe.filter({}, 'slug', 1000),
  ]);

  const itemBySlug = new Map(existingItems.map((record: any) => [sanitizeText(record?.slug, 160), record]));
  const recipeBySlug = new Map(existingRecipes.map((record: any) => [sanitizeText(record?.slug, 160), record]));
  const recipeSlugSet = new Set(dataset.recipes.map((recipe) => sanitizeText(recipe.slug, 160)).filter(Boolean));

  let createdItems = 0;
  let updatedItems = 0;
  for (const item of dataset.items) {
    const slug = sanitizeText(item.slug, 160);
    if (!slug) {
      continue;
    }

    const existing = itemBySlug.get(slug);
    const payload = withCatalogProvenance(item, item.source_urls || [], catalogVersion, ruleVersion);

    if (!existing) {
      const created = await base44.asServiceRole.entities.GameItem.create(payload);
      itemBySlug.set(slug, created);
      createdItems += 1;
      continue;
    }

    if (forceUpdate || needsCatalogRefresh(existing, catalogVersion)) {
      await base44.asServiceRole.entities.GameItem.update(existing.id, payload);
      updatedItems += 1;
    }
  }

  let createdRecipes = 0;
  let updatedRecipes = 0;
  for (const recipe of dataset.recipes) {
    const slug = sanitizeText(recipe.slug, 160);
    if (!slug) {
      continue;
    }

    const existing = recipeBySlug.get(slug);
    const payload = withCatalogProvenance(recipe, recipe.source_urls || [recipe.source_url || ''], catalogVersion, ruleVersion);

    if (!existing) {
      const created = await base44.asServiceRole.entities.Recipe.create(payload);
      recipeBySlug.set(slug, created);
      createdRecipes += 1;
      continue;
    }

    if (forceUpdate || needsCatalogRefresh(existing, catalogVersion)) {
      await base44.asServiceRole.entities.Recipe.update(existing.id, payload);
      updatedRecipes += 1;
    }
  }

  let disabledLegacyRecipes = 0;
  for (const recipe of existingRecipes) {
    const slug = sanitizeText(recipe?.slug, 160);
    if (!slug || recipeSlugSet.has(slug)) {
      continue;
    }

    const looksLegacyStarter = LEGACY_SLUGS.has(slug)
      || hasSourceRefLike(recipe, 'RecipeCatalog:starter-v1')
      || hasSourceRefLike(recipe, 'starter-v1');

    if (!looksLegacyStarter || recipe?.is_available === false) {
      continue;
    }

    await base44.asServiceRole.entities.Recipe.update(recipe.id, withCatalogProvenance({
      is_available: false,
    }, recipe?.source_urls || recipe?.source_refs || [], catalogVersion, ruleVersion));
    disabledLegacyRecipes += 1;
  }

  const nextState = await base44.asServiceRole.entities.GameCatalogState.update(state.id, {
    active_catalog_version: catalogVersion,
    active_sync_mode: mode,
    snapshot_catalog_version: mode === 'snapshot' ? catalogVersion : sanitizeText(state.snapshot_catalog_version, 80),
    live_catalog_version: mode === 'live' ? catalogVersion : sanitizeText(state.live_catalog_version, 80),
    last_sync_mode: mode,
    last_sync_status: 'ok',
    last_sync_at: new Date().toISOString(),
    last_snapshot_sync_at: mode === 'snapshot' ? new Date().toISOString() : sanitizeText(state.last_snapshot_sync_at, 40),
    last_live_sync_at: mode === 'live' ? new Date().toISOString() : sanitizeText(state.last_live_sync_at, 40),
    item_count: dataset.items.length,
    recipe_count: dataset.recipes.length,
    backfill_target_version: catalogVersion,
    backfill_status: sanitizeText(state.backfill_completed_version, 80) === catalogVersion ? 'completed' : 'idle',
    backfill_cursors: {},
    backfill_counts: {
      scanned: 0,
      updated: 0,
      unmatched: 0,
      pending: true,
    },
    source_manifest: Array.isArray(dataset.sourceManifest) ? dataset.sourceManifest : HUMANITZ_SOURCE_MANIFEST,
    last_error: '',
  });

  return {
    catalog_version: catalogVersion,
    mode,
    items: {
      total: dataset.items.length,
      created: createdItems,
      updated: updatedItems,
    },
    recipes: {
      total: dataset.recipes.length,
      created: createdRecipes,
      updated: updatedRecipes,
      disabled_legacy: disabledLegacyRecipes,
    },
    state: nextState,
  };
}

async function runBackfillChunk(base44: any, {
  chunkSize,
  forceStart,
}: {
  chunkSize: number;
  forceStart: boolean;
}) {
  const state = await getOrCreateCatalogState(base44);
  const activeCatalogVersion = sanitizeText(state.active_catalog_version, 80) || HUMANITZ_CATALOG_VERSION;
  if (!activeCatalogVersion) {
    return { skipped: 'no_active_catalog' };
  }

  if (!forceStart && sanitizeText(state.backfill_completed_version, 80) === activeCatalogVersion) {
    return { completed: true, processed: 0 };
  }

  const lock = await acquireBackfillLock(base44, state);
  if (!lock) {
    return { skipped: 'locked' };
  }

  try {
    const [gameItems, recipes] = await Promise.all([
      base44.asServiceRole.entities.GameItem.filter({}, 'name', 1000),
      base44.asServiceRole.entities.Recipe.filter({}, 'name', 1000),
    ]);
    const catalogLookup = buildCatalogLookup(gameItems);
    const recipeById = new Map(recipes.map((recipe: any) => [sanitizeText(recipe.id, 120), recipe]));

    const counts = normalizeBackfillCounts(state.backfill_counts);
    const cursors = isRecord(state.backfill_cursors) ? { ...state.backfill_cursors } : {};
    const phases = [
      await backfillInventoryItems(base44, catalogLookup, chunkSize),
      await backfillCraftingProjects(base44, catalogLookup, recipeById, chunkSize),
      await backfillTradeOffers(base44, catalogLookup, chunkSize),
      await backfillTradeRequests(base44, catalogLookup, chunkSize),
    ];

    let updatedInRun = 0;
    let unmatchedOutstanding = 0;
    let firstPendingPhase = '';
    for (const phase of phases) {
      cursors[phase.key] = phase.cursor;
      updatedInRun += phase.updated;
      unmatchedOutstanding += phase.unmatched;
      if (!firstPendingPhase && !phase.done) {
        firstPendingPhase = phase.key;
      }
    }

    const completed = phases.every((phase) => phase.done);

    const nextState = await base44.asServiceRole.entities.GameCatalogState.update(state.id, {
      backfill_status: completed ? 'completed' : 'running',
      backfill_completed_version: completed ? activeCatalogVersion : sanitizeText(state.backfill_completed_version, 80),
      backfill_counts: {
        scanned: counts.scanned + phases.reduce((sum, phase) => sum + phase.scanned, 0),
        updated: counts.updated + updatedInRun,
        unmatched: unmatchedOutstanding,
        pending: !completed,
      },
      backfill_cursors: cursors,
      last_sync_mode: 'backfill',
      last_sync_status: 'ok',
      last_sync_at: new Date().toISOString(),
      last_error: '',
      backfill_lock_id: '',
      backfill_lock_expires_at: '',
    });

    return {
      completed,
      processed: updatedInRun,
      pending_phase: firstPendingPhase || null,
      state: nextState,
    };
  } catch (error) {
    await base44.asServiceRole.entities.GameCatalogState.update(state.id, {
      backfill_status: 'error',
      last_sync_mode: 'backfill',
      last_sync_status: 'error',
      last_sync_at: new Date().toISOString(),
      last_error: error instanceof Error ? error.message.slice(0, 400) : 'Unexpected backfill error',
      backfill_lock_id: '',
      backfill_lock_expires_at: '',
    });
    throw error;
  }
}

async function backfillInventoryItems(base44: any, catalogLookup: any, chunkSize: number) {
  const records = await base44.asServiceRole.entities.InventoryItem.filter({}, 'created_date', 1000);
  const candidates = [];
  let unmatched = 0;

  for (const record of records) {
    const catalogItem = findCatalogItem(catalogLookup, record);
    if (!catalogItem) {
      if (!sanitizeText(record.game_item_slug, 160)) {
        unmatched += 1;
      }
      continue;
    }

    const snapshot = buildInventorySnapshotFromCatalog(catalogItem, {
      rarity: sanitizeText(record.rarity || catalogItem.rarity, 24) || 'common',
      value: record.value,
    });
    const patch = compactObject({
      game_item_slug: snapshot.game_item_slug,
      name: snapshot.name,
      category: snapshot.category,
      rarity: snapshot.rarity,
      value: snapshot.value,
    });

    if (needsRecordUpdate(record, patch)) {
      candidates.push({ record, patch });
    }
  }

  const chunk = candidates.slice(0, chunkSize);
  for (const candidate of chunk) {
    await base44.asServiceRole.entities.InventoryItem.update(candidate.record.id, candidate.patch);
  }

  return buildBackfillPhaseResult('inventory_items', records.length, chunk, candidates.length, unmatched);
}

async function backfillCraftingProjects(base44: any, catalogLookup: any, recipeById: Map<string, any>, chunkSize: number) {
  const records = await base44.asServiceRole.entities.CraftingProject.filter({}, 'created_date', 1000);
  const candidates = [];
  let unmatched = 0;

  for (const record of records) {
    const recipe = recipeById.get(sanitizeText(record.recipe_id, 120)) || null;
    const materials = (Array.isArray(record.materials) ? record.materials : []).map((material: any, index: number) => {
      const recipeIngredient = Array.isArray(recipe?.ingredients) ? recipe.ingredients[index] : null;
      const catalogItem = findCatalogItem(catalogLookup, {
        game_item_slug: material?.game_item_slug || recipeIngredient?.item_slug,
        name: material?.resource || recipeIngredient?.resource,
      });

      if (!catalogItem && !sanitizeText(material?.game_item_slug, 160)) {
        unmatched += 1;
      }

      return compactObject({
        resource: sanitizeText(catalogItem?.name || material?.resource || recipeIngredient?.resource, 160),
        game_item_slug: sanitizeText(catalogItem?.slug || material?.game_item_slug || recipeIngredient?.item_slug, 160),
        needed: clampNumber(material?.needed ?? recipeIngredient?.amount, 1, 999, 1),
        have: clampNumber(material?.have, 0, 999, 0),
      });
    });

    const outputItem = findCatalogItem(catalogLookup, {
      game_item_slug: record.output_item_slug || recipe?.item_slug,
      name: record.output_name || record.title,
    });
    if (!outputItem && !sanitizeText(record.output_item_slug, 160) && sanitizeText(record.output_name || record.title, 160)) {
      unmatched += 1;
    }

    const patch = compactObject({
      materials,
      output_item_slug: sanitizeText(outputItem?.slug || record.output_item_slug || recipe?.item_slug, 160),
      output_name: sanitizeText(outputItem?.name || record.output_name || record.title, 160),
      output_category: sanitizeText(record.output_category || recipe?.category || outputItem?.category, 40),
    });

    if (needsRecordUpdate(record, patch)) {
      candidates.push({ record, patch });
    }
  }

  const chunk = candidates.slice(0, chunkSize);
  for (const candidate of chunk) {
    await base44.asServiceRole.entities.CraftingProject.update(candidate.record.id, candidate.patch);
  }

  return buildBackfillPhaseResult('crafting_projects', records.length, chunk, candidates.length, unmatched);
}

async function backfillTradeOffers(base44: any, catalogLookup: any, chunkSize: number) {
  const records = await base44.asServiceRole.entities.TradeOffer.filter({}, 'created_date', 1000);
  const candidates = [];
  let unmatched = 0;

  for (const record of records) {
    const patch = ensureStructuredTradeOffer(record, catalogLookup);
    unmatched += countUnmatchedLineItems(patch.offered_items) + countUnmatchedLineItems(patch.requested_items);
    if (needsRecordUpdate(record, patch)) {
      candidates.push({ record, patch });
    }
  }

  const chunk = candidates.slice(0, chunkSize);
  for (const candidate of chunk) {
    await base44.asServiceRole.entities.TradeOffer.update(candidate.record.id, candidate.patch);
  }

  return buildBackfillPhaseResult('trade_offers', records.length, chunk, candidates.length, unmatched);
}

async function backfillTradeRequests(base44: any, catalogLookup: any, chunkSize: number) {
  const records = await base44.asServiceRole.entities.TradeRequest.filter({}, 'created_date', 1000);
  const candidates = [];
  let unmatched = 0;

  for (const record of records) {
    const patch = ensureStructuredTradeRequest(record, catalogLookup);
    unmatched += countUnmatchedLineItems(patch.offered_items) + countUnmatchedLineItems(patch.requested_items);
    if (needsRecordUpdate(record, patch)) {
      candidates.push({ record, patch });
    }
  }

  const chunk = candidates.slice(0, chunkSize);
  for (const candidate of chunk) {
    await base44.asServiceRole.entities.TradeRequest.update(candidate.record.id, candidate.patch);
  }

  return buildBackfillPhaseResult('trade_requests', records.length, chunk, candidates.length, unmatched);
}

function buildBackfillPhaseResult(key: string, scanned: number, processedChunk: any[], candidateCount: number, unmatched: number) {
  const pending = Math.max(0, candidateCount - processedChunk.length);
  return {
    key,
    scanned,
    updated: processedChunk.length,
    unmatched,
    done: pending === 0,
    cursor: {
      last_processed_id: sanitizeText(processedChunk[processedChunk.length - 1]?.record?.id, 120),
      pending,
      done: pending === 0,
    },
  };
}

async function acquireBackfillLock(base44: any, state: any) {
  const now = Date.now();
  const lockExpiresAt = Date.parse(sanitizeText(state.backfill_lock_expires_at, 40));
  if (sanitizeText(state.backfill_lock_id, 120) && Number.isFinite(lockExpiresAt) && lockExpiresAt > now) {
    return null;
  }

  const lockId = crypto.randomUUID();
  const updated = await base44.asServiceRole.entities.GameCatalogState.update(state.id, {
    backfill_status: 'running',
    backfill_lock_id: lockId,
    backfill_lock_expires_at: new Date(now + BACKFILL_LOCK_MS).toISOString(),
  });

  return sanitizeText(updated.backfill_lock_id, 120) === lockId ? updated : null;
}

async function getCatalogStatus(base44: any) {
  const state = await getOrCreateCatalogState(base44);
  return {
    ...state,
    source_manifest: Array.isArray(state.source_manifest) && state.source_manifest.length > 0
      ? state.source_manifest
      : HUMANITZ_SOURCE_MANIFEST,
    snapshot_reference: {
      version: HUMANITZ_CATALOG_VERSION,
      items: HUMANITZ_ITEM_CATALOG.length,
      recipes: HUMANITZ_RECIPE_CATALOG.length,
    },
  };
}

async function getOrCreateCatalogState(base44: any) {
  const existing = (await base44.asServiceRole.entities.GameCatalogState.filter({ key: STATE_KEY }, '-created_date', 1))[0];
  if (existing) {
    return existing;
  }

  return base44.asServiceRole.entities.GameCatalogState.create({
    key: STATE_KEY,
    active_catalog_version: '',
    snapshot_catalog_version: '',
    live_catalog_version: '',
    active_sync_mode: 'snapshot',
    last_sync_mode: 'bootstrap',
    last_sync_status: 'idle',
    item_count: 0,
    recipe_count: 0,
    backfill_target_version: '',
    backfill_completed_version: '',
    backfill_status: 'idle',
    backfill_cursors: {},
    backfill_counts: {
      scanned: 0,
      updated: 0,
      unmatched: 0,
      pending: false,
    },
    source_manifest: HUMANITZ_SOURCE_MANIFEST,
    last_error: '',
  });
}

function withCatalogProvenance<T extends Record<string, unknown>>(payload: T, sourceUrls: unknown[], catalogVersion: string, ruleVersion: string) {
  return withProvenance({
    ...payload,
    catalog_version: catalogVersion,
  }, {
    dataOrigin: DATA_ORIGINS.MIGRATION,
    sourceRefs: normalizeSourceRefs(sourceUrls),
    ruleVersion,
    generatedAt: catalogVersion,
  });
}

function normalizeSourceRefs(value: unknown[]) {
  return Array.from(new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => sanitizeText(item, 200))
      .filter(Boolean),
  )).slice(0, 24);
}

function normalizeBackfillCounts(value: unknown) {
  if (!isRecord(value)) {
    return { scanned: 0, updated: 0 };
  }

  return {
    scanned: clampNumber(value.scanned, 0, 999999, 0),
    updated: clampNumber(value.updated, 0, 999999, 0),
  };
}

function countUnmatchedLineItems(items: any[]) {
  return (Array.isArray(items) ? items : []).filter((item) => !sanitizeText(item?.game_item_slug, 160)).length;
}

function needsCatalogRefresh(record: any, catalogVersion: string) {
  return sanitizeText(record?.catalog_version, 80) !== catalogVersion;
}

function hasSourceRefLike(record: any, needle: string) {
  const target = sanitizeText(needle, 200);
  return Boolean(
    target
    && Array.isArray(record?.source_refs)
    && record.source_refs.some((entry: unknown) => sanitizeText(entry, 200).includes(target)),
  );
}

function needsRecordUpdate(record: any, patch: Record<string, unknown>) {
  return Object.entries(patch).some(([key, value]) => {
    const currentValue = record?.[key];
    if (Array.isArray(value) || isRecord(value)) {
      return JSON.stringify(currentValue ?? null) !== JSON.stringify(value);
    }
    return currentValue !== value;
  });
}

async function fetchLiveCatalogJson(url: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        return response.json();
      }

      lastError = new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
      if (![403, 429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
        throw lastError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === 2) {
        throw lastError;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  throw lastError || new Error(`Request failed for ${url}`);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
