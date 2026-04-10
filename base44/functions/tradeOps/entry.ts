import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  buildCatalogLookup,
  buildInventorySnapshotFromCatalog,
  buildTradeLineItemFromInventoryItem,
  clampNumber,
  deriveTradeOfferCompatibility,
  deriveTradeRequestCompatibility,
  ensureStructuredTradeOffer,
  ensureStructuredTradeRequest,
  findCatalogItem,
  normalizeTradeLineItems,
  sanitizeText,
} from '../_shared/catalogIdentity.mjs';
import {
  PLAYER_TRADE_SETTLEMENT_LOCK_MS,
  buildPlayerTradeLedgerEntry,
  buildPlayerTradeSourceKey,
  buildSyntheticLedgerEntryFromTradeOffer,
  buildSyntheticLedgerEntryFromTradeRequest,
  describeTradeRequirementGap,
} from '../_shared/playerTradeSettlement.mjs';

const LISTING_TERMINAL_STATUSES = new Set(['accepted', 'cancelled', 'expired']);
const REQUEST_TERMINAL_STATUSES = new Set(['accepted', 'rejected', 'cancelled', 'expired']);
const HISTORY_BACKFILL_LIMIT = 250;

class ApiError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

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

    const catalogLookup = await loadCatalogLookup(base44);

    if (action === 'create_listing') {
      const listingType = normalizeListingType(body.listing_type || body.type);
      const sector = sanitizeText(body.sector, 24).toUpperCase();
      if (!sector) {
        throw new ApiError(400, 'sector is required');
      }

      const offeredItems = await hydrateListingLineItems({
        rawItems: body.offered_items,
        inventoryItemId: body.inventory_item_id,
        ownerEmail: user.email,
        base44,
        catalogLookup,
      });
      const requestedItems = normalizeTradeLineItems(body.requested_items, catalogLookup);
      const offeredCredits = clampNumber(body.offered_credits, 0, 999999, 0);
      const requestedCredits = clampNumber(body.requested_credits, 0, 999999, 0);

      if (listingType === 'offer' && offeredItems.length === 0) {
        throw new ApiError(400, 'An offer listing needs at least one offered item');
      }
      if (listingType === 'want' && requestedItems.length === 0) {
        throw new ApiError(400, 'A want listing needs at least one requested item');
      }

      const compatibility = deriveTradeOfferCompatibility({
        listing_type: listingType,
        offered_items: offeredItems,
        requested_items: requestedItems,
        offered_credits: offeredCredits,
        requested_credits: requestedCredits,
      });

      const listing = await base44.asServiceRole.entities.TradeOffer.create({
        seller_email: user.email,
        seller_callsign: resolveCallsign(user, user.email),
        listing_type: listingType,
        offered_items: offeredItems,
        requested_items: requestedItems,
        offered_credits: offeredCredits,
        requested_credits: requestedCredits,
        sector,
        status: 'open',
        settlement_error: '',
        settlement_lock_id: '',
        settlement_lock_expires_at: '',
        ...compatibility,
      });

      return Response.json({ status: 'ok', listing });
    }

    if (action === 'cancel_listing') {
      const listingId = sanitizeText(body.listing_id || body.id, 120);
      if (!listingId) {
        throw new ApiError(400, 'listing_id is required');
      }

      const listing = await getEntityById(base44, 'TradeOffer', listingId);
      if (!listing) {
        throw new ApiError(404, 'Listing not found');
      }
      if (listing.seller_email !== user.email && user.role !== 'admin') {
        throw new ApiError(403, 'Forbidden');
      }
      if (LISTING_TERMINAL_STATUSES.has(sanitizeText(listing.status, 24)) && sanitizeText(listing.ledger_entry_id, 120)) {
        return Response.json({ status: 'ok', listing });
      }

      const structured = ensureStructuredTradeOffer(listing, catalogLookup);
      const { record, ledger } = await finalizeTradeOfferWithoutSettlement({
        base44,
        listing,
        structured,
        status: sanitizeText(listing.status, 24) === 'expired' ? 'expired' : 'cancelled',
        actorNote: sanitizeText(listing.status, 24) === 'expired' ? 'Listing expired before settlement' : 'Listing cancelled by seller',
      });
      return Response.json({ status: 'ok', listing: record, ledger_entry: ledger });
    }

    if (action === 'accept_listing' || action === 'fulfill_listing') {
      const listingId = sanitizeText(body.listing_id || body.id, 120);
      if (!listingId) {
        throw new ApiError(400, 'listing_id is required');
      }

      const listing = await getEntityById(base44, 'TradeOffer', listingId);
      if (!listing) {
        throw new ApiError(404, 'Listing not found');
      }
      if (sanitizeText(listing.status, 24) !== 'open') {
        throw new ApiError(400, 'Listing is no longer open');
      }
      if (listing.seller_email === user.email) {
        throw new ApiError(400, 'Cannot settle your own listing');
      }

      const structured = ensureStructuredTradeOffer(listing, catalogLookup);
      const expectedListingType = action === 'fulfill_listing' ? 'want' : 'offer';
      if (structured.listing_type !== expectedListingType) {
        throw new ApiError(
          400,
          expectedListingType === 'offer'
            ? 'Only public offer listings can be accepted directly'
            : 'Only want listings can be fulfilled directly',
        );
      }

      const result = await settleTradeRecord({
        base44,
        catalogLookup,
        entityName: 'TradeOffer',
        sourceType: 'trade_offer',
        record: listing,
        terminalStatuses: LISTING_TERMINAL_STATUSES,
        structuredRecord: structured,
        initiator: {
          email: listing.seller_email,
          callsign: sanitizeText(listing.seller_callsign, 120),
          items: structured.offered_items,
          credits: structured.offered_credits,
        },
        counterparty: {
          email: user.email,
          callsign: resolveCallsign(user, user.email),
          items: structured.requested_items,
          credits: structured.requested_credits,
        },
        notes: action === 'accept_listing'
          ? 'Live settlement via listing acceptance'
          : 'Live settlement via want listing fulfillment',
        buildFinalPatch: (ledgerId: string, settledAt: string) => ({
          ...deriveTradeOfferCompatibility(structured),
          ...structured,
          status: 'accepted',
          buyer_email: user.email,
          resolved_at: settledAt,
          ledger_entry_id: ledgerId,
          settlement_error: '',
          settlement_lock_id: '',
          settlement_lock_expires_at: '',
        }),
      });

      return Response.json({
        status: 'ok',
        listing: result.record,
        ledger_entry: result.ledger,
        transferred_inventory_rows: result.settlementDetails.transferred_inventory_rows,
      });
    }

    if (action === 'create_request') {
      const receiverEmail = sanitizeText(body.receiver_email, 160);
      if (!receiverEmail) {
        throw new ApiError(400, 'receiver_email is required');
      }
      if (receiverEmail === user.email) {
        throw new ApiError(400, 'Cannot send a trade request to yourself');
      }

      const offeredItems = await hydrateRequestLineItems({
        rawItems: body.offered_items,
        ownerEmail: user.email,
        base44,
        catalogLookup,
      });
      const requestedItems = normalizeTradeLineItems(body.requested_items, catalogLookup);
      const offeredCredits = clampNumber(body.offered_credits, 0, 999999, 0);
      const requestedCredits = clampNumber(body.requested_credits, 0, 999999, 0);
      const message = sanitizeText(body.message, 600);
      const receiver = (await base44.asServiceRole.entities.User.filter({ email: receiverEmail }, '-created_date', 1))[0];
      if (!receiver?.email) {
        throw new ApiError(404, 'Receiver not found');
      }

      if (offeredItems.length === 0 && requestedItems.length === 0 && offeredCredits <= 0 && requestedCredits <= 0) {
        throw new ApiError(400, 'A trade request must offer or request something');
      }

      const compatibility = deriveTradeRequestCompatibility({
        offered_items: offeredItems,
        requested_items: requestedItems,
        offered_credits: offeredCredits,
        requested_credits: requestedCredits,
      });

      const tradeRequest = await base44.asServiceRole.entities.TradeRequest.create({
        sender_email: user.email,
        sender_callsign: resolveCallsign(user, user.email),
        receiver_email: receiver.email,
        receiver_callsign: resolveCallsign(receiver, receiver.email),
        offered_items: offeredItems,
        requested_items: requestedItems,
        offered_credits: offeredCredits,
        requested_credits: requestedCredits,
        message,
        status: 'pending',
        settlement_error: '',
        settlement_lock_id: '',
        settlement_lock_expires_at: '',
        expires_at: sanitizeText(body.expires_at, 40) || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        ...compatibility,
      });

      return Response.json({ status: 'ok', trade_request: tradeRequest });
    }

    if (action === 'respond_request') {
      const requestId = sanitizeText(body.request_id || body.id, 120);
      const responseAction = sanitizeText(body.response_action || body.status, 24);
      if (!requestId || !responseAction) {
        throw new ApiError(400, 'request_id and response_action are required');
      }

      const tradeRequest = await getEntityById(base44, 'TradeRequest', requestId);
      if (!tradeRequest) {
        throw new ApiError(404, 'Trade request not found');
      }

      if (responseAction === 'cancelled') {
        if (tradeRequest.sender_email !== user.email && user.role !== 'admin') {
          throw new ApiError(403, 'Forbidden');
        }
      } else if (tradeRequest.receiver_email !== user.email && user.role !== 'admin') {
        throw new ApiError(403, 'Forbidden');
      }

      if (!['accepted', 'rejected', 'cancelled'].includes(responseAction)) {
        throw new ApiError(400, 'Unsupported response_action');
      }

      const structured = ensureStructuredTradeRequest(tradeRequest, catalogLookup);
      const responseMessage = sanitizeText(body.response_message, 600);

      if (responseAction === 'accepted') {
        if (isExpiredPendingRequest(tradeRequest)) {
          await finalizeTradeRequestWithoutSettlement({
            base44,
            tradeRequest,
            structured,
            status: 'expired',
            responseMessage: 'Request expired before settlement',
            actorNote: 'Request expired before settlement',
          });
          throw new ApiError(409, 'Trade request has expired');
        }

        const result = await settleTradeRecord({
          base44,
          catalogLookup,
          entityName: 'TradeRequest',
          sourceType: 'trade_request',
          record: tradeRequest,
          terminalStatuses: REQUEST_TERMINAL_STATUSES,
          structuredRecord: structured,
          initiator: {
            email: tradeRequest.sender_email,
            callsign: sanitizeText(tradeRequest.sender_callsign, 120),
            items: structured.offered_items,
            credits: structured.offered_credits,
          },
          counterparty: {
            email: tradeRequest.receiver_email,
            callsign: sanitizeText(tradeRequest.receiver_callsign, 120),
            items: structured.requested_items,
            credits: structured.requested_credits,
          },
          notes: 'Live settlement via request acceptance',
          buildFinalPatch: (ledgerId: string, settledAt: string) => ({
            ...deriveTradeRequestCompatibility(structured),
            ...structured,
            status: 'accepted',
            response_message: responseMessage,
            resolved_at: settledAt,
            ledger_entry_id: ledgerId,
            settlement_error: '',
            settlement_lock_id: '',
            settlement_lock_expires_at: '',
          }),
        });

        return Response.json({
          status: 'ok',
          trade_request: result.record,
          ledger_entry: result.ledger,
          transferred_inventory_rows: result.settlementDetails.transferred_inventory_rows,
        });
      }

      const finalized = await finalizeTradeRequestWithoutSettlement({
        base44,
        tradeRequest,
        structured,
        status: responseAction as 'rejected' | 'cancelled',
        responseMessage,
        actorNote: responseAction === 'rejected' ? 'Request rejected by receiver' : 'Request cancelled by sender',
      });
      return Response.json({ status: 'ok', trade_request: finalized.record, ledger_entry: finalized.ledger });
    }

    if (action === 'counter_request') {
      const requestId = sanitizeText(body.request_id || body.id, 120);
      if (!requestId) {
        throw new ApiError(400, 'request_id is required');
      }

      const tradeRequest = await getEntityById(base44, 'TradeRequest', requestId);
      if (!tradeRequest) {
        throw new ApiError(404, 'Trade request not found');
      }
      if (tradeRequest.receiver_email !== user.email && user.role !== 'admin') {
        throw new ApiError(403, 'Forbidden');
      }

      const structured = ensureStructuredTradeRequest(tradeRequest, catalogLookup);
      await finalizeTradeRequestWithoutSettlement({
        base44,
        tradeRequest,
        structured,
        status: 'cancelled',
        responseMessage: 'Counter-offer sent',
        actorNote: 'Original request cancelled because a counter-offer was sent',
      });

      const offeredItems = await hydrateRequestLineItems({
        rawItems: body.offered_items,
        ownerEmail: user.email,
        base44,
        catalogLookup,
      });
      const requestedItems = normalizeTradeLineItems(body.requested_items, catalogLookup);
      const offeredCredits = clampNumber(body.offered_credits, 0, 999999, 0);
      const requestedCredits = clampNumber(body.requested_credits, 0, 999999, 0);

      if (offeredItems.length === 0 && requestedItems.length === 0 && offeredCredits <= 0 && requestedCredits <= 0) {
        throw new ApiError(400, 'A counter-offer must offer or request something');
      }

      const compatibility = deriveTradeRequestCompatibility({
        offered_items: offeredItems,
        requested_items: requestedItems,
        offered_credits: offeredCredits,
        requested_credits: requestedCredits,
      });

      const counter = await base44.asServiceRole.entities.TradeRequest.create({
        sender_email: user.email,
        sender_callsign: resolveCallsign(user, user.email),
        receiver_email: sanitizeText(tradeRequest.sender_email, 160),
        receiver_callsign: sanitizeText(tradeRequest.sender_callsign || tradeRequest.sender_email, 120),
        offered_items: offeredItems,
        requested_items: requestedItems,
        offered_credits: offeredCredits,
        requested_credits: requestedCredits,
        message: sanitizeText(body.message, 600) || 'Counter-offer',
        status: 'pending',
        settlement_error: '',
        settlement_lock_id: '',
        settlement_lock_expires_at: '',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        ...compatibility,
      });

      return Response.json({ status: 'ok', trade_request: counter });
    }

    if (action === 'backfill_history') {
      if (user.role !== 'admin') {
        throw new ApiError(403, 'Forbidden');
      }

      const limit = clampNumber(body.limit, 1, HISTORY_BACKFILL_LIMIT, 100);
      const [existingEntries, offers, requests] = await Promise.all([
        base44.asServiceRole.entities.PlayerTradeLedgerEntry.list('-created_date', 1000),
        base44.asServiceRole.entities.TradeOffer.list('-created_date', 500),
        base44.asServiceRole.entities.TradeRequest.list('-created_date', 500),
      ]);

      const existingBySource = new Map(
        (Array.isArray(existingEntries) ? existingEntries : [])
          .map((entry: any) => [buildPlayerTradeSourceKey(entry.source_type, entry.source_id), entry])
          .filter(([key]) => Boolean(key)),
      );
      const userCache = new Map<string, any>();
      const counters = { created: 0, linked_existing: 0, scanned: 0 };

      for (const offer of Array.isArray(offers) ? offers : []) {
        if (counters.scanned >= limit) break;
        if (!LISTING_TERMINAL_STATUSES.has(sanitizeText(offer.status, 24))) continue;
        counters.scanned += 1;

        const structured = ensureStructuredTradeOffer(offer, catalogLookup);
        const key = buildPlayerTradeSourceKey('trade_offer', offer.id);
        const existing = key ? existingBySource.get(key) : null;
        if (offer.ledger_entry_id || existing?.id) {
          if (!offer.ledger_entry_id && existing?.id) {
            await base44.asServiceRole.entities.TradeOffer.update(offer.id, {
              ...deriveTradeOfferCompatibility(structured),
              ...structured,
              ledger_entry_id: existing.id,
              resolved_at: sanitizeText(offer.resolved_at, 40) || sanitizeText(existing.recorded_at, 40) || offer.created_date,
            });
            counters.linked_existing += 1;
          }
          continue;
        }

        const counterpartyCallsign = await loadCounterpartyCallsign(userCache, base44, offer.buyer_email);
        const ledger = await base44.asServiceRole.entities.PlayerTradeLedgerEntry.create(
          buildSyntheticLedgerEntryFromTradeOffer(
            { ...offer, ...structured },
            { counterpartyCallsign },
          ),
        );
        await base44.asServiceRole.entities.TradeOffer.update(offer.id, {
          ...deriveTradeOfferCompatibility(structured),
          ...structured,
          ledger_entry_id: ledger.id,
          resolved_at: sanitizeText(offer.resolved_at, 40) || sanitizeText(ledger.recorded_at, 40) || offer.created_date,
        });
        counters.created += 1;
      }

      for (const tradeRequest of Array.isArray(requests) ? requests : []) {
        if (counters.scanned >= limit) break;
        if (!REQUEST_TERMINAL_STATUSES.has(sanitizeText(tradeRequest.status, 24))) continue;
        counters.scanned += 1;

        const structured = ensureStructuredTradeRequest(tradeRequest, catalogLookup);
        const key = buildPlayerTradeSourceKey('trade_request', tradeRequest.id);
        const existing = key ? existingBySource.get(key) : null;
        if (tradeRequest.ledger_entry_id || existing?.id) {
          if (!tradeRequest.ledger_entry_id && existing?.id) {
            await base44.asServiceRole.entities.TradeRequest.update(tradeRequest.id, {
              ...deriveTradeRequestCompatibility(structured),
              ...structured,
              ledger_entry_id: existing.id,
              resolved_at: sanitizeText(tradeRequest.resolved_at, 40) || sanitizeText(existing.recorded_at, 40) || tradeRequest.created_date,
            });
            counters.linked_existing += 1;
          }
          continue;
        }

        const ledger = await base44.asServiceRole.entities.PlayerTradeLedgerEntry.create(
          buildSyntheticLedgerEntryFromTradeRequest({ ...tradeRequest, ...structured }),
        );
        await base44.asServiceRole.entities.TradeRequest.update(tradeRequest.id, {
          ...deriveTradeRequestCompatibility(structured),
          ...structured,
          ledger_entry_id: ledger.id,
          resolved_at: sanitizeText(tradeRequest.resolved_at, 40) || sanitizeText(ledger.recorded_at, 40) || tradeRequest.created_date,
        });
        counters.created += 1;
      }

      return Response.json({ status: 'ok', ...counters });
    }

    throw new ApiError(400, 'Unknown action');
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        error.details ? { error: error.message, details: error.details } : { error: error.message },
        { status: error.status },
      );
    }

    console.error('tradeOps error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});

async function loadCatalogLookup(base44: any) {
  const gameItems = await base44.asServiceRole.entities.GameItem.filter({}, 'name', 1000);
  return buildCatalogLookup(gameItems);
}

async function hydrateListingLineItems({
  rawItems,
  inventoryItemId,
  ownerEmail,
  base44,
  catalogLookup,
}: {
  rawItems: unknown;
  inventoryItemId: unknown;
  ownerEmail: string;
  base44: any;
  catalogLookup: ReturnType<typeof buildCatalogLookup>;
}) {
  const normalizedItems = normalizeTradeLineItems(rawItems as any[], catalogLookup);
  if (normalizedItems.length > 0) {
    return normalizedItems;
  }

  const safeInventoryItemId = sanitizeText(inventoryItemId, 120);
  if (!safeInventoryItemId) {
    return [];
  }

  const inventoryItem = await getEntityById(base44, 'InventoryItem', safeInventoryItemId);
  if (!inventoryItem || inventoryItem.owner_email !== ownerEmail) {
    return [];
  }

  const catalogItem = findCatalogItem(catalogLookup, inventoryItem);
  return [
    buildTradeLineItemFromInventoryItem(
      inventoryItem,
      clampNumber((rawItems as any)?.[0]?.quantity ?? inventoryItem.quantity, 1, 999, 1),
      catalogItem,
    ),
  ];
}

async function hydrateRequestLineItems({
  rawItems,
  ownerEmail,
  base44,
  catalogLookup,
}: {
  rawItems: unknown;
  ownerEmail: string;
  base44: any;
  catalogLookup: ReturnType<typeof buildCatalogLookup>;
}) {
  const normalizedItems = Array.isArray(rawItems) ? rawItems : [];
  const hydrated = [];

  for (const rawItem of normalizedItems) {
    const inventoryItemId = sanitizeText((rawItem as any)?.inventory_item_id, 120);
    if (!inventoryItemId) {
      const lineItem = normalizeTradeLineItems([rawItem], catalogLookup)[0];
      if (lineItem) {
        hydrated.push(lineItem);
      }
      continue;
    }

    const inventoryItem = await getEntityById(base44, 'InventoryItem', inventoryItemId);
    if (!inventoryItem || inventoryItem.owner_email !== ownerEmail) {
      continue;
    }

    const catalogItem = findCatalogItem(catalogLookup, inventoryItem);
    hydrated.push(buildTradeLineItemFromInventoryItem(
      inventoryItem,
      clampNumber((rawItem as any)?.quantity, 1, 999, 1),
      catalogItem,
    ));
  }

  return hydrated;
}

async function getEntityById(base44: any, entityName: string, id: string) {
  const results = await base44.asServiceRole.entities[entityName].filter({ id }, '-created_date', 1);
  return results[0] || null;
}

function normalizeListingType(value: unknown) {
  const listingType = sanitizeText(value, 24);
  return listingType === 'want' ? 'want' : 'offer';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveCallsign(user: any, fallbackEmail: string) {
  return sanitizeText(user?.callsign || user?.full_name || fallbackEmail, 120);
}

function normalizeWalletNumber(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.round(numeric));
}

function isExpiredPendingRequest(record: any) {
  if (sanitizeText(record?.status, 24) !== 'pending') {
    return false;
  }
  const expiresAt = Date.parse(sanitizeText(record?.expires_at, 40));
  return Number.isFinite(expiresAt) && expiresAt < Date.now();
}

function buildSettlementErrorMessage({
  initiator,
  counterparty,
  initiatorGap,
  counterpartyGap,
}: {
  initiator: { callsign: string };
  counterparty: { callsign: string };
  initiatorGap: ReturnType<typeof describeTradeRequirementGap>;
  counterpartyGap: ReturnType<typeof describeTradeRequirementGap>;
}) {
  const messages = [];
  if (!initiatorGap.ok) {
    messages.push(`${sanitizeText(initiator.callsign, 120) || 'Initiator'} cannot settle: ${initiatorGap.message}`);
  }
  if (!counterpartyGap.ok) {
    messages.push(`${sanitizeText(counterparty.callsign, 120) || 'Counterparty'} cannot settle: ${counterpartyGap.message}`);
  }
  return messages.join(' • ') || 'Trade requirements are no longer satisfied';
}

async function getUserByEmail(base44: any, email: string) {
  const safeEmail = sanitizeText(email, 160);
  if (!safeEmail) {
    return null;
  }

  const users = await base44.asServiceRole.entities.User.filter({ email: safeEmail }, '-created_date', 1);
  return users[0] || null;
}

async function getInventoryByOwner(base44: any, ownerEmail: string) {
  const safeOwnerEmail = sanitizeText(ownerEmail, 160);
  if (!safeOwnerEmail) {
    return [];
  }
  return base44.asServiceRole.entities.InventoryItem.filter({ owner_email: safeOwnerEmail }, 'created_date', 500);
}

async function loadCounterpartyCallsign(cache: Map<string, any>, base44: any, email: string) {
  const safeEmail = sanitizeText(email, 160);
  if (!safeEmail) {
    return '';
  }

  if (cache.has(safeEmail)) {
    return resolveCallsign(cache.get(safeEmail), safeEmail);
  }

  const user = await getUserByEmail(base44, safeEmail);
  cache.set(safeEmail, user);
  return resolveCallsign(user, safeEmail);
}

async function safeDeleteEntity(base44: any, entityName: string, id: string) {
  if (!sanitizeText(id, 120)) {
    return;
  }

  await base44.asServiceRole.entities[entityName].delete(id).catch(() => null);
}

async function safeSetSettlementError(base44: any, entityName: string, id: string, errorMessage: string) {
  await base44.asServiceRole.entities[entityName].update(id, {
    settlement_error: sanitizeText(errorMessage, 400),
    settlement_lock_id: '',
    settlement_lock_expires_at: '',
  }).catch(() => null);
}

async function acquireSettlementLock(base44: any, entityName: string, record: any, terminalStatuses: Set<string>) {
  const status = sanitizeText(record?.status, 24);
  if (terminalStatuses.has(status) && sanitizeText(record?.ledger_entry_id, 120)) {
    throw new ApiError(409, 'Trade has already been resolved');
  }

  const activeLockId = sanitizeText(record?.settlement_lock_id, 120);
  const activeLockExpiresAt = Date.parse(sanitizeText(record?.settlement_lock_expires_at, 40));
  if (activeLockId && Number.isFinite(activeLockExpiresAt) && activeLockExpiresAt > Date.now()) {
    throw new ApiError(409, 'Trade is already being settled');
  }

  const lockId = crypto.randomUUID();
  await base44.asServiceRole.entities[entityName].update(record.id, {
    settlement_lock_id: lockId,
    settlement_lock_expires_at: new Date(Date.now() + PLAYER_TRADE_SETTLEMENT_LOCK_MS).toISOString(),
  });

  const lockedRecord = await getEntityById(base44, entityName, record.id);
  if (!lockedRecord || sanitizeText(lockedRecord.settlement_lock_id, 120) !== lockId) {
    throw new ApiError(409, 'Trade is already being settled');
  }

  return { lockId };
}

async function releaseSettlementLock(base44: any, entityName: string, id: string) {
  await base44.asServiceRole.entities[entityName].update(id, {
    settlement_lock_id: '',
    settlement_lock_expires_at: '',
  }).catch(() => null);
}

async function rollbackSettlement(rollbackSteps: Array<() => Promise<void>>) {
  for (const rollback of [...rollbackSteps].reverse()) {
    try {
      await rollback();
    } catch (error) {
      console.error('tradeOps rollback error:', error);
    }
  }
}

async function createTransferredInventoryRows({
  base44,
  catalogLookup,
  recipientEmail,
  sourceCallsign,
  sourceRecord,
  allocations,
  rollbackSteps,
}: {
  base44: any;
  catalogLookup: ReturnType<typeof buildCatalogLookup>;
  recipientEmail: string;
  sourceCallsign: string;
  sourceRecord: any;
  allocations: any[];
  rollbackSteps: Array<() => Promise<void>>;
}) {
  const created = [];

  for (const allocation of Array.isArray(allocations) ? allocations : []) {
    const inventoryItem = allocation?.inventory_item;
    const lineItem = allocation?.line_item;
    if (!inventoryItem || !lineItem) {
      continue;
    }

    const catalogItem = findCatalogItem(catalogLookup, lineItem) || findCatalogItem(catalogLookup, inventoryItem);
    const snapshot = buildInventorySnapshotFromCatalog(catalogItem, {
      name: lineItem.name || inventoryItem.name,
      category: lineItem.inventory_category || inventoryItem.category,
      rarity: inventoryItem.rarity,
      value: lineItem.value ?? inventoryItem.value,
      game_item_slug: lineItem.game_item_slug || inventoryItem.game_item_slug,
    });

    const createdItem = await base44.asServiceRole.entities.InventoryItem.create({
      owner_email: recipientEmail,
      name: snapshot.name || inventoryItem.name,
      game_item_slug: snapshot.game_item_slug || sanitizeText(inventoryItem.game_item_slug, 160),
      category: snapshot.category || sanitizeText(inventoryItem.category, 40) || 'misc',
      quantity: clampNumber(allocation.quantity, 1, 999, 1),
      rarity: snapshot.rarity || sanitizeText(inventoryItem.rarity, 24) || 'common',
      condition: clampNumber(lineItem.condition ?? inventoryItem.condition, 0, 100, 100),
      value: clampNumber(lineItem.value ?? inventoryItem.value ?? snapshot.value, 0, 999999, 0),
      source: `player trade • ${sanitizeText(sourceCallsign, 120)}`,
      sector: sanitizeText(sourceRecord?.sector, 24) || sanitizeText(inventoryItem.sector, 24),
    });

    created.push(createdItem);
    rollbackSteps.push(async () => {
      await safeDeleteEntity(base44, 'InventoryItem', createdItem.id);
    });
  }

  return created;
}

async function applyUserWalletSettlement({
  base44,
  initiatorUser,
  counterpartyUser,
  initiatorCredits,
  counterpartyCredits,
  rollbackSteps,
}: {
  base44: any;
  initiatorUser: any;
  counterpartyUser: any;
  initiatorCredits: number;
  counterpartyCredits: number;
  rollbackSteps: Array<() => Promise<void>>;
}) {
  const initiatorNext = {
    credits: normalizeWalletNumber(initiatorUser.credits) - normalizeWalletNumber(initiatorCredits) + normalizeWalletNumber(counterpartyCredits),
    total_spent: normalizeWalletNumber(initiatorUser.total_spent) + normalizeWalletNumber(initiatorCredits),
    total_earned: normalizeWalletNumber(initiatorUser.total_earned) + normalizeWalletNumber(counterpartyCredits),
  };
  const counterpartyNext = {
    credits: normalizeWalletNumber(counterpartyUser.credits) - normalizeWalletNumber(counterpartyCredits) + normalizeWalletNumber(initiatorCredits),
    total_spent: normalizeWalletNumber(counterpartyUser.total_spent) + normalizeWalletNumber(counterpartyCredits),
    total_earned: normalizeWalletNumber(counterpartyUser.total_earned) + normalizeWalletNumber(initiatorCredits),
  };

  if (initiatorNext.credits < 0 || counterpartyNext.credits < 0) {
    throw new ApiError(409, 'A participant no longer has enough credits to settle this trade');
  }

  await base44.asServiceRole.entities.User.update(initiatorUser.id, initiatorNext);
  rollbackSteps.push(async () => {
    await base44.asServiceRole.entities.User.update(initiatorUser.id, {
      credits: normalizeWalletNumber(initiatorUser.credits),
      total_spent: normalizeWalletNumber(initiatorUser.total_spent),
      total_earned: normalizeWalletNumber(initiatorUser.total_earned),
    });
  });

  await base44.asServiceRole.entities.User.update(counterpartyUser.id, counterpartyNext);
  rollbackSteps.push(async () => {
    await base44.asServiceRole.entities.User.update(counterpartyUser.id, {
      credits: normalizeWalletNumber(counterpartyUser.credits),
      total_spent: normalizeWalletNumber(counterpartyUser.total_spent),
      total_earned: normalizeWalletNumber(counterpartyUser.total_earned),
    });
  });
}

async function debitInventoryAllocations(base44: any, allocations: any[], rollbackSteps: Array<() => Promise<void>>) {
  const aggregated = new Map<string, { inventoryItem: any; quantity: number }>();

  for (const allocation of Array.isArray(allocations) ? allocations : []) {
    const itemId = sanitizeText(allocation?.inventory_item_id, 120);
    const inventoryItem = allocation?.inventory_item;
    if (!itemId || !inventoryItem) {
      continue;
    }

    const current = aggregated.get(itemId);
    if (current) {
      current.quantity += clampNumber(allocation.quantity, 1, 999, 1);
    } else {
      aggregated.set(itemId, {
        inventoryItem,
        quantity: clampNumber(allocation.quantity, 1, 999, 1),
      });
    }
  }

  for (const [itemId, entry] of aggregated.entries()) {
    const currentItem = await getEntityById(base44, 'InventoryItem', itemId);
    if (!currentItem || currentItem.owner_email !== entry.inventoryItem.owner_email) {
      throw new ApiError(409, `Referenced inventory row no longer exists for ${entry.inventoryItem.name}`);
    }

    const currentQuantity = clampNumber(currentItem.quantity, 0, 999, 0);
    if (currentQuantity < entry.quantity) {
      throw new ApiError(409, `Not enough ${sanitizeText(currentItem.name, 160)} remains to settle this trade`);
    }

    const snapshot = { ...currentItem };
    const remaining = currentQuantity - entry.quantity;
    if (remaining > 0) {
      await base44.asServiceRole.entities.InventoryItem.update(currentItem.id, { quantity: remaining });
      rollbackSteps.push(async () => {
        await base44.asServiceRole.entities.InventoryItem.update(currentItem.id, { quantity: snapshot.quantity });
      });
      continue;
    }

    await base44.asServiceRole.entities.InventoryItem.delete(currentItem.id);
    rollbackSteps.push(async () => {
      await base44.asServiceRole.entities.InventoryItem.create({
        owner_email: snapshot.owner_email,
        name: snapshot.name,
        game_item_slug: snapshot.game_item_slug,
        category: snapshot.category,
        quantity: snapshot.quantity,
        rarity: snapshot.rarity,
        is_equipped: snapshot.is_equipped,
        condition: snapshot.condition,
        value: snapshot.value,
        source: snapshot.source,
        sector: snapshot.sector,
        notes: snapshot.notes,
      });
    });
  }
}

async function executeSettlement({
  base44,
  catalogLookup,
  initiatorUser,
  counterpartyUser,
  initiator,
  counterparty,
  initiatorGap,
  counterpartyGap,
  sourceRecord,
}: {
  base44: any;
  catalogLookup: ReturnType<typeof buildCatalogLookup>;
  initiatorUser: any;
  counterpartyUser: any;
  initiator: { email: string; callsign: string; credits: number };
  counterparty: { email: string; callsign: string; credits: number };
  initiatorGap: ReturnType<typeof describeTradeRequirementGap>;
  counterpartyGap: ReturnType<typeof describeTradeRequirementGap>;
  sourceRecord: any;
}) {
  const rollbackSteps: Array<() => Promise<void>> = [];

  try {
    const counterpartyCreated = await createTransferredInventoryRows({
      base44,
      catalogLookup,
      recipientEmail: counterparty.email,
      sourceCallsign: initiator.callsign,
      sourceRecord,
      allocations: initiatorGap.itemPlan.allocations,
      rollbackSteps,
    });
    const initiatorCreated = await createTransferredInventoryRows({
      base44,
      catalogLookup,
      recipientEmail: initiator.email,
      sourceCallsign: counterparty.callsign,
      sourceRecord,
      allocations: counterpartyGap.itemPlan.allocations,
      rollbackSteps,
    });

    await applyUserWalletSettlement({
      base44,
      initiatorUser,
      counterpartyUser,
      initiatorCredits: initiator.credits,
      counterpartyCredits: counterparty.credits,
      rollbackSteps,
    });

    await debitInventoryAllocations(base44, initiatorGap.itemPlan.allocations, rollbackSteps);
    await debitInventoryAllocations(base44, counterpartyGap.itemPlan.allocations, rollbackSteps);

    return {
      transferred_inventory_rows: counterpartyCreated.length + initiatorCreated.length,
      rollbackSteps,
    };
  } catch (error) {
    await rollbackSettlement(rollbackSteps);
    throw error;
  }
}

async function settleTradeRecord({
  base44,
  catalogLookup,
  entityName,
  sourceType,
  record,
  terminalStatuses,
  structuredRecord,
  initiator,
  counterparty,
  notes,
  buildFinalPatch,
}: {
  base44: any;
  catalogLookup: ReturnType<typeof buildCatalogLookup>;
  entityName: string;
  sourceType: 'trade_offer' | 'trade_request';
  record: any;
  terminalStatuses: Set<string>;
  structuredRecord: any;
  initiator: { email: string; callsign: string; items: any[]; credits: number };
  counterparty: { email: string; callsign: string; items: any[]; credits: number };
  notes: string;
  buildFinalPatch: (ledgerId: string, settledAt: string) => Record<string, unknown>;
}) {
  const { lockId } = await acquireSettlementLock(base44, entityName, record, terminalStatuses);
  let lockReleased = false;
  let settlementDetails: { transferred_inventory_rows: number; rollbackSteps: Array<() => Promise<void>> } | null = null;
  let ledger: any = null;

  try {
    const lockedRecord = await getEntityById(base44, entityName, record.id);
    if (!lockedRecord) {
      throw new ApiError(404, 'Trade record no longer exists');
    }
    if (sanitizeText(lockedRecord.settlement_lock_id, 120) !== lockId) {
      throw new ApiError(409, 'Trade is already being settled');
    }
    if (terminalStatuses.has(sanitizeText(lockedRecord.status, 24))) {
      throw new ApiError(409, 'Trade has already been resolved');
    }

    const [initiatorUser, counterpartyUser] = await Promise.all([
      getUserByEmail(base44, initiator.email),
      getUserByEmail(base44, counterparty.email),
    ]);

    if (!initiatorUser?.email || !counterpartyUser?.email) {
      throw new ApiError(404, 'A participant in this trade could not be found');
    }

    const [initiatorInventory, counterpartyInventory] = await Promise.all([
      getInventoryByOwner(base44, initiator.email),
      getInventoryByOwner(base44, counterparty.email),
    ]);

    const initiatorGap = describeTradeRequirementGap({
      inventoryItems: initiatorInventory,
      lineItems: initiator.items,
      currentCredits: initiatorUser.credits,
      requiredCredits: initiator.credits,
    });
    const counterpartyGap = describeTradeRequirementGap({
      inventoryItems: counterpartyInventory,
      lineItems: counterparty.items,
      currentCredits: counterpartyUser.credits,
      requiredCredits: counterparty.credits,
    });

    if (!initiatorGap.ok || !counterpartyGap.ok) {
      const errorMessage = buildSettlementErrorMessage({
        initiator,
        counterparty,
        initiatorGap,
        counterpartyGap,
      });
      await safeSetSettlementError(base44, entityName, lockedRecord.id, errorMessage);
      lockReleased = true;
      throw new ApiError(409, errorMessage);
    }

    settlementDetails = await executeSettlement({
      base44,
      catalogLookup,
      initiatorUser,
      counterpartyUser,
      initiator,
      counterparty,
      initiatorGap,
      counterpartyGap,
      sourceRecord: lockedRecord,
    });

    const settledAt = new Date().toISOString();
    ledger = await base44.asServiceRole.entities.PlayerTradeLedgerEntry.create(
      buildPlayerTradeLedgerEntry({
        sourceType,
        sourceId: lockedRecord.id,
        outcomeStatus: 'completed',
        settlementMode: 'live',
        listingType: sourceType === 'trade_offer' ? structuredRecord.listing_type : undefined,
        initiatorEmail: initiator.email,
        initiatorCallsign: initiator.callsign,
        counterpartyEmail: counterparty.email,
        counterpartyCallsign: counterparty.callsign,
        initiatorItems: structuredRecord.offered_items ?? initiator.items,
        counterpartyItems: structuredRecord.requested_items ?? counterparty.items,
        initiatorCredits: structuredRecord.offered_credits ?? initiator.credits,
        counterpartyCredits: structuredRecord.requested_credits ?? counterparty.credits,
        recordedAt: settledAt,
        notes,
      }),
    );

    try {
      const finalRecord = await base44.asServiceRole.entities[entityName].update(
        lockedRecord.id,
        buildFinalPatch(ledger.id, settledAt),
      );
      lockReleased = true;
      return { record: finalRecord, ledger, settlementDetails };
    } catch (error) {
      await rollbackSettlement(settlementDetails.rollbackSteps);
      await safeDeleteEntity(base44, 'PlayerTradeLedgerEntry', ledger.id);
      settlementDetails = null;
      ledger = null;
      throw error;
    }
  } catch (error) {
    if (settlementDetails?.rollbackSteps) {
      await rollbackSettlement(settlementDetails.rollbackSteps);
      settlementDetails = null;
    }
    if (ledger?.id) {
      await safeDeleteEntity(base44, 'PlayerTradeLedgerEntry', ledger.id);
      ledger = null;
    }
    if (!(error instanceof ApiError)) {
      await safeSetSettlementError(base44, entityName, record.id, error instanceof Error ? error.message : 'Settlement failed');
    }
    throw error;
  } finally {
    if (!lockReleased) {
      await releaseSettlementLock(base44, entityName, record.id);
    }
  }
}

async function finalizeTradeOfferWithoutSettlement({
  base44,
  listing,
  structured,
  status,
  actorNote,
}: {
  base44: any;
  listing: any;
  structured: any;
  status: 'cancelled' | 'expired';
  actorNote: string;
}) {
  const { lockId } = await acquireSettlementLock(base44, 'TradeOffer', listing, LISTING_TERMINAL_STATUSES);
  let lockReleased = false;

  try {
    const locked = await getEntityById(base44, 'TradeOffer', listing.id);
    if (!locked) {
      throw new ApiError(404, 'Listing not found');
    }
    if (sanitizeText(locked.settlement_lock_id, 120) !== lockId) {
      throw new ApiError(409, 'Listing is already being updated');
    }
    if (sanitizeText(locked.status, 24) === 'accepted') {
      throw new ApiError(400, 'Accepted listings cannot be cancelled');
    }

    const counterpartyCallsign = await loadCounterpartyCallsign(new Map(), base44, locked.buyer_email);
    const ledger = locked.ledger_entry_id
      ? await getEntityById(base44, 'PlayerTradeLedgerEntry', locked.ledger_entry_id)
      : await base44.asServiceRole.entities.PlayerTradeLedgerEntry.create(
        buildSyntheticLedgerEntryFromTradeOffer(
          {
            ...locked,
            ...structured,
            status,
            resolved_at: sanitizeText(locked.resolved_at, 40) || new Date().toISOString(),
          },
          { counterpartyCallsign, notes: actorNote },
        ),
      );

    const resolvedAt = sanitizeText(locked.resolved_at, 40) || sanitizeText(ledger?.recorded_at, 40) || new Date().toISOString();
    const record = await base44.asServiceRole.entities.TradeOffer.update(locked.id, {
      ...deriveTradeOfferCompatibility(structured),
      ...structured,
      status,
      resolved_at: resolvedAt,
      ledger_entry_id: ledger?.id || locked.ledger_entry_id,
      settlement_error: '',
      settlement_lock_id: '',
      settlement_lock_expires_at: '',
    });
    lockReleased = true;
    return { record, ledger };
  } finally {
    if (!lockReleased) {
      await releaseSettlementLock(base44, 'TradeOffer', listing.id);
    }
  }
}

async function finalizeTradeRequestWithoutSettlement({
  base44,
  tradeRequest,
  structured,
  status,
  responseMessage,
  actorNote,
}: {
  base44: any;
  tradeRequest: any;
  structured: any;
  status: 'rejected' | 'cancelled' | 'expired';
  responseMessage: string;
  actorNote: string;
}) {
  const { lockId } = await acquireSettlementLock(base44, 'TradeRequest', tradeRequest, REQUEST_TERMINAL_STATUSES);
  let lockReleased = false;

  try {
    const locked = await getEntityById(base44, 'TradeRequest', tradeRequest.id);
    if (!locked) {
      throw new ApiError(404, 'Trade request not found');
    }
    if (sanitizeText(locked.settlement_lock_id, 120) !== lockId) {
      throw new ApiError(409, 'Trade request is already being updated');
    }

    const ledger = locked.ledger_entry_id
      ? await getEntityById(base44, 'PlayerTradeLedgerEntry', locked.ledger_entry_id)
      : await base44.asServiceRole.entities.PlayerTradeLedgerEntry.create(
        buildSyntheticLedgerEntryFromTradeRequest(
          {
            ...locked,
            ...structured,
            status,
            resolved_at: sanitizeText(locked.resolved_at, 40) || new Date().toISOString(),
          },
          { notes: actorNote },
        ),
      );

    const resolvedAt = sanitizeText(locked.resolved_at, 40) || sanitizeText(ledger?.recorded_at, 40) || new Date().toISOString();
    const record = await base44.asServiceRole.entities.TradeRequest.update(locked.id, {
      ...deriveTradeRequestCompatibility(structured),
      ...structured,
      status,
      response_message: responseMessage,
      resolved_at: resolvedAt,
      ledger_entry_id: ledger?.id || locked.ledger_entry_id,
      settlement_error: '',
      settlement_lock_id: '',
      settlement_lock_expires_at: '',
    });
    lockReleased = true;
    return { record, ledger };
  } finally {
    if (!lockReleased) {
      await releaseSettlementLock(base44, 'TradeRequest', tradeRequest.id);
    }
  }
}
