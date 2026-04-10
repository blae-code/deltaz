import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';
import { REFERENCE_RECIPE_CATALOG } from '../_shared/recipeCatalog.ts';

const PROJECT_CATEGORIES = new Set(['weapon', 'ammo', 'armor', 'clothing', 'backpack', 'tool', 'medical', 'consumable', 'material', 'upgrade', 'trade_good', 'building', 'custom']);
const RECIPE_CATEGORIES = new Set(['weapon', 'ammo', 'armor', 'clothing', 'backpack', 'tool', 'medical', 'consumable', 'material', 'upgrade', 'trade_good']);
const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const INVENTORY_CATEGORY_MAP: Record<string, string> = {
  weapon: 'weapon',
  ammo: 'ammo',
  armor: 'armor',
  clothing: 'armor',
  backpack: 'armor',
  tool: 'tool',
  medical: 'consumable',
  consumable: 'consumable',
  material: 'material',
  upgrade: 'misc',
  trade_good: 'misc',
  building: 'misc',
  custom: 'misc',
};

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
    if (!isRecord(body)) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const action = sanitizeText(body.action, 40);
    if (!action) {
      return Response.json({ error: 'Action is required' }, { status: 400 });
    }

    if (action === 'ensure_catalog') {
      const existingRecipes = await base44.asServiceRole.entities.Recipe.filter({});
      const existingSlugs = new Set(
        existingRecipes
          .map((recipe: any) => sanitizeText(recipe?.slug, 120))
          .filter(Boolean),
      );

      const created = [];
      for (const recipe of REFERENCE_RECIPE_CATALOG) {
        if (existingSlugs.has(recipe.slug)) {
          continue;
        }

        created.push(await base44.asServiceRole.entities.Recipe.create(withProvenance({
          ...recipe,
          category: normalizeRecipeCategory(recipe.category),
          difficulty: normalizeRecipeDifficulty(recipe.difficulty),
          ingredients: normalizeIngredients(recipe.ingredients),
          item_slug: sanitizeText((recipe as any).item_slug, 160),
          crafting_station: sanitizeText((recipe as any).crafting_station, 120),
          crafting_time_seconds: clampNumber((recipe as any).crafting_time_seconds, 0, 999999, 0),
          crafted_durability: clampNumber((recipe as any).crafted_durability, 0, 100, 0),
          requires_recipe: Boolean((recipe as any).requires_recipe),
          return_item: sanitizeText((recipe as any).return_item, 120),
          return_amount: clampNumber((recipe as any).return_amount, 0, 999, 0),
          return_durability: clampNumber((recipe as any).return_durability, 0, 100, 0),
          source_scope: sanitizeText((recipe as any).source_scope, 40),
          source_dataset: sanitizeText((recipe as any).source_dataset, 80),
          source_url: sanitizeText((recipe as any).source_url, 240),
          source_urls: Array.isArray((recipe as any).source_urls)
            ? (recipe as any).source_urls.map((entry: unknown) => sanitizeText(entry, 240)).filter(Boolean).slice(0, 24)
            : [],
          catalog_version: sanitizeText((recipe as any).catalog_version, 80),
          bonus_type: sanitizeText(recipe.bonus_type, 40),
          bonus_value: clampNumber(recipe.bonus_value, 0, 999, 0),
          output_value: clampNumber(recipe.output_value, 0, 999999, 0),
          output_quantity: clampNumber(recipe.output_quantity, 1, 999, 1),
          is_available: recipe.is_available !== false,
        }, {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs: [
            buildSourceRef('RecipeCatalog', 'humanitz-community', recipe.slug),
            ...(
              Array.isArray((recipe as any).source_urls)
                ? (recipe as any).source_urls
                : []
            ),
          ],
        })));
        existingSlugs.add(recipe.slug);
      }

      return Response.json({
        status: 'ok',
        seeded: created.length > 0,
        created: created.length,
        total_recipes: existingRecipes.length + created.length,
      });
    }

    if (action === 'create_project') {
      const recipeId = sanitizeText(body.recipe_id, 120);
      const recipe = recipeId
        ? (await base44.asServiceRole.entities.Recipe.filter({ id: recipeId }))[0]
        : null;

      if (recipeId && !recipe) {
        return Response.json({ error: 'Recipe not found' }, { status: 404 });
      }
      if (recipe && recipe.is_available === false) {
        return Response.json({ error: 'Recipe is not available' }, { status: 400 });
      }

      const title = sanitizeText(recipe?.name || body.title, 120);
      const description = sanitizeText(body.description || recipe?.description, 600);
      const category = normalizeProjectCategory(recipe?.category || body.category);
      const priority = normalizePriority(body.priority);
      const materials = normalizeMaterials(body.materials, recipe?.ingredients);

      if (!title) {
        return Response.json({ error: 'title required' }, { status: 400 });
      }
      if (materials.length === 0) {
        return Response.json({ error: 'At least one material is required' }, { status: 400 });
      }

      const outputName = sanitizeText(recipe?.name || body.output_name || title, 120);
      const outputItemSlug = sanitizeText(recipe?.item_slug || body.output_item_slug, 160);
      const outputCategory = normalizeProjectCategory(recipe?.category || body.output_category || category);
      const outputValue = clampNumber(recipe?.output_value ?? body.output_value, 0, 999999, 0);
      const outputQuantity = clampNumber(recipe?.output_quantity ?? body.output_quantity, 1, 999, 1);
      const projectStatus = materials.every((item) => item.have >= item.needed) ? 'ready' : 'gathering';

      const project = await base44.asServiceRole.entities.CraftingProject.create(withProvenance({
        owner_email: user.email,
        title,
        description,
        recipe_id: recipe?.id || recipeId || '',
        category,
        priority,
        status: projectStatus,
        materials,
        output_name: outputName,
        output_item_slug: outputItemSlug,
        output_category: outputCategory,
        output_value: outputValue,
        output_quantity: outputQuantity,
      }, {
        dataOrigin: recipe ? DATA_ORIGINS.SYSTEM_RULE : DATA_ORIGINS.USER,
        sourceRefs: [
          buildSourceRef('player', user.email),
          recipe ? buildSourceRef('Recipe', recipe.id) : '',
        ],
      }));

      return Response.json({
        status: 'ok',
        project,
      });
    }

    if (action === 'complete_project') {
      const projectId = sanitizeText(body.project_id || body.id, 120);
      if (!projectId) {
        return Response.json({ error: 'project_id required' }, { status: 400 });
      }

      const project = (await base44.asServiceRole.entities.CraftingProject.filter({ id: projectId }))[0];
      if (!project) {
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }
      if (project.owner_email !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (project.status === 'abandoned') {
        return Response.json({ error: 'Abandoned projects cannot be completed' }, { status: 400 });
      }

      const existingLog = await getExistingCraftLog(base44, project.id);
      if (project.status === 'completed' || existingLog) {
        return Response.json({
          status: 'ok',
          already_completed: true,
          project_id: project.id,
          craft_log_id: existingLog?.id || null,
        });
      }

      const materials = normalizeMaterials(project.materials);
      if (materials.length === 0 || materials.some((item) => item.have < item.needed)) {
        return Response.json({ error: 'All materials must be gathered before completion' }, { status: 400 });
      }

      const completedAt = new Date().toISOString();
      const outputName = sanitizeText(project.output_name || project.title, 120);
      const outputItemSlug = sanitizeText(project.output_item_slug, 160);
      const outputCategory = normalizeProjectCategory(project.output_category || project.category);
      const outputValue = clampNumber(project.output_value, 0, 999999, 0);
      const outputQuantity = clampNumber(project.output_quantity, 1, 999, 1);
      const sourceRefs = [
        buildSourceRef('CraftingProject', project.id),
        project.recipe_id ? buildSourceRef('Recipe', project.recipe_id) : '',
        buildSourceRef('player', project.owner_email),
      ];

      await base44.asServiceRole.entities.CraftingProject.update(project.id, withProvenance({
        status: 'completed',
        completed_at: completedAt,
        output_name: outputName,
        output_item_slug: outputItemSlug,
        output_category: outputCategory,
        output_value: outputValue,
        output_quantity: outputQuantity,
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs,
      }));

      const craftLog = await base44.asServiceRole.entities.CraftLog.create(buildCraftLogPayload(project, {
        completedAt,
        outputName,
        outputCategory,
        outputValue,
        outputQuantity,
        sourceRefs,
      }));

      const existingCraftedItems = await base44.asServiceRole.entities.InventoryItem.filter({
        owner_email: project.owner_email,
        source: 'crafted',
      });
      const alreadyCreated = existingCraftedItems.find((item: any) => sanitizeText(item.notes, 160) === `CraftingProject:${project.id}`);

      const craftedItem = alreadyCreated || await base44.asServiceRole.entities.InventoryItem.create(withProvenance({
        owner_email: project.owner_email,
        name: outputName,
        game_item_slug: outputItemSlug,
        category: INVENTORY_CATEGORY_MAP[outputCategory] || 'misc',
        quantity: outputQuantity,
        condition: 100,
        value: outputValue,
        source: 'crafted',
        notes: `CraftingProject:${project.id}`,
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs,
      }));

      return Response.json({
        status: 'ok',
        project_id: project.id,
        craft_log_id: craftLog.id,
        inventory_item_id: craftedItem.id,
      });
    }

    if (action === 'backfill_logs') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }

      const completedProjects = await base44.asServiceRole.entities.CraftingProject.filter({ status: 'completed' }, '-created_date', 1000);
      const craftLogs = await base44.asServiceRole.entities.CraftLog.filter({}, '-created_date', 1000);
      const logByProjectId = new Map(craftLogs.map((entry: any) => [entry.project_id, entry]));

      let createdCount = 0;
      for (const project of completedProjects) {
        if (!project?.id || logByProjectId.has(project.id)) {
          continue;
        }

        const completedAt = sanitizeText(project.completed_at, 40) || new Date().toISOString();
        const outputName = sanitizeText(project.output_name || project.title, 120);
        const outputCategory = normalizeProjectCategory(project.output_category || project.category);
        const outputValue = clampNumber(project.output_value, 0, 999999, 0);
        const outputQuantity = clampNumber(project.output_quantity, 1, 999, 1);
        const sourceRefs = [
          buildSourceRef('CraftingProject', project.id),
          project.recipe_id ? buildSourceRef('Recipe', project.recipe_id) : '',
          buildSourceRef('player', project.owner_email),
        ];

        const log = await base44.asServiceRole.entities.CraftLog.create(buildCraftLogPayload(project, {
          completedAt,
          outputName,
          outputCategory,
          outputValue,
          outputQuantity,
          sourceRefs,
        }));
        logByProjectId.set(project.id, log);
        createdCount += 1;
      }

      return Response.json({
        status: 'ok',
        scanned: completedProjects.length,
        created: createdCount,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('craftingOps error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});

async function getExistingCraftLog(base44: any, projectId: string) {
  const logs = await base44.asServiceRole.entities.CraftLog.filter({ project_id: projectId }, '-created_date', 1);
  return logs[0] || null;
}

function buildCraftLogPayload(project: any, {
  completedAt,
  outputName,
  outputCategory,
  outputValue,
  outputQuantity,
  sourceRefs,
}: {
  completedAt: string;
  outputName: string;
  outputCategory: string;
  outputValue: number;
  outputQuantity: number;
  sourceRefs: string[];
}) {
  return withProvenance({
    player_email: sanitizeText(project.owner_email, 160),
    project_id: sanitizeText(project.id, 120),
    recipe_id: sanitizeText(project.recipe_id, 120),
    project_title: sanitizeText(project.title, 120),
    output_name: outputName,
    output_category: outputCategory,
    output_value: outputValue,
    quantity: outputQuantity,
    status: 'success',
    completed_at: completedAt,
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs,
  });
}

function normalizeRecipeCategory(value: unknown) {
  const normalized = sanitizeText(value, 40);
  return RECIPE_CATEGORIES.has(normalized) ? normalized : 'tool';
}

function normalizeProjectCategory(value: unknown) {
  const normalized = sanitizeText(value, 40);
  return PROJECT_CATEGORIES.has(normalized) ? normalized : 'custom';
}

function normalizeRecipeDifficulty(value: unknown) {
  const normalized = sanitizeText(value, 40);
  return ['basic', 'intermediate', 'advanced', 'masterwork'].includes(normalized) ? normalized : 'basic';
}

function normalizePriority(value: unknown) {
  const normalized = sanitizeText(value, 24);
  return PRIORITIES.has(normalized) ? normalized : 'normal';
}

function normalizeIngredients(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      resource: sanitizeText(item?.resource, 80),
      item_slug: sanitizeText(item?.item_slug, 160),
      amount: clampNumber(item?.amount, 1, 999, 1),
    }))
    .filter((item) => item.resource);
}

function normalizeMaterials(value: unknown, fallbackIngredients: unknown[] = []) {
  const source = Array.isArray(value) && value.length > 0 ? value : fallbackIngredients;
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item) => ({
      resource: sanitizeText(item?.resource, 80),
      game_item_slug: sanitizeText(item?.game_item_slug || item?.item_slug, 160),
      needed: clampNumber(item?.needed ?? item?.amount, 1, 999, 1),
      have: clampNumber(item?.have, 0, 999, 0),
    }))
    .filter((item) => item.resource);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function sanitizeText(value: unknown, maxLength = 160) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
