import {
  clampNumber,
  compactObject,
  formatTradeLineItems,
  sanitizeText,
} from "./catalogIdentity.mjs";

export const PLAYER_TRADE_SETTLEMENT_LOCK_MS = 60 * 1000;

function normalizeTimestamp(value) {
  const parsed = Date.parse(sanitizeText(value, 40));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortInventoryItems(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const timeDiff = normalizeTimestamp(left?.created_date) - normalizeTimestamp(right?.created_date);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return sanitizeText(left?.id, 120).localeCompare(sanitizeText(right?.id, 120));
  });
}

function normalizeLineItemSnapshot(lineItem) {
  if (!lineItem || typeof lineItem !== "object") {
    return null;
  }

  const normalized = compactObject({
    game_item_slug: sanitizeText(lineItem.game_item_slug, 160),
    name: sanitizeText(lineItem.name || lineItem.resource, 160),
    quantity: clampNumber(lineItem.quantity, 1, 999, 1),
    inventory_item_id: sanitizeText(lineItem.inventory_item_id, 120),
    inventory_category: sanitizeText(lineItem.inventory_category || lineItem.category, 40),
    condition: lineItem.condition == null ? undefined : clampNumber(lineItem.condition, 0, 100, 100),
    value: lineItem.value == null ? undefined : clampNumber(lineItem.value, 0, 999999, 0),
  });

  return normalized?.name ? normalized : null;
}

function doesInventoryItemMatchLineItem(inventoryItem, lineItem) {
  const inventoryId = sanitizeText(inventoryItem?.id, 120);
  const lineInventoryId = sanitizeText(lineItem?.inventory_item_id, 120);
  if (lineInventoryId) {
    return inventoryId === lineInventoryId;
  }

  const inventorySlug = sanitizeText(inventoryItem?.game_item_slug, 160);
  const lineSlug = sanitizeText(lineItem?.game_item_slug, 160);
  if (inventorySlug && lineSlug) {
    return inventorySlug === lineSlug;
  }

  return sanitizeText(inventoryItem?.name, 160).toLowerCase() === sanitizeText(lineItem?.name, 160).toLowerCase();
}

export function buildInventoryTransferPlan(inventoryItems, lineItems) {
  const inventory = sortInventoryItems(inventoryItems);
  const normalizedLineItems = (Array.isArray(lineItems) ? lineItems : [])
    .map(normalizeLineItemSnapshot)
    .filter(Boolean);
  const remainingById = new Map(
    inventory.map((item) => [sanitizeText(item?.id, 120), clampNumber(item?.quantity, 0, 999, 0)]),
  );
  const allocations = [];
  const missing = [];

  for (const lineItem of normalizedLineItems) {
    let needed = clampNumber(lineItem.quantity, 1, 999, 1);
    const candidates = inventory.filter((inventoryItem) => doesInventoryItemMatchLineItem(inventoryItem, lineItem));

    if (sanitizeText(lineItem.inventory_item_id, 120)) {
      const exact = candidates.find((inventoryItem) => sanitizeText(inventoryItem?.id, 120) === sanitizeText(lineItem.inventory_item_id, 120));
      const exactAvailable = exact ? remainingById.get(sanitizeText(exact.id, 120)) || 0 : 0;
      if (!exact || exactAvailable < needed) {
        missing.push(compactObject({
          ...lineItem,
          missing_quantity: needed,
        }));
        continue;
      }

      allocations.push({
        inventory_item_id: sanitizeText(exact.id, 120),
        quantity: needed,
        inventory_item: exact,
        line_item: lineItem,
      });
      remainingById.set(sanitizeText(exact.id, 120), exactAvailable - needed);
      continue;
    }

    for (const candidate of candidates) {
      if (needed <= 0) {
        break;
      }

      const candidateId = sanitizeText(candidate?.id, 120);
      const available = remainingById.get(candidateId) || 0;
      if (available <= 0) {
        continue;
      }

      const taken = Math.min(needed, available);
      allocations.push({
        inventory_item_id: candidateId,
        quantity: taken,
        inventory_item: candidate,
        line_item: lineItem,
      });
      remainingById.set(candidateId, available - taken);
      needed -= taken;
    }

    if (needed > 0) {
      missing.push(compactObject({
        ...lineItem,
        missing_quantity: needed,
      }));
    }
  }

  return {
    ok: missing.length === 0,
    allocations,
    missing,
    normalized_line_items: normalizedLineItems,
  };
}

export function describeTradeRequirementGap({ inventoryItems, lineItems, currentCredits, requiredCredits }) {
  const itemPlan = buildInventoryTransferPlan(inventoryItems, lineItems);
  const safeCurrentCredits = clampNumber(currentCredits, 0, 999999, 0);
  const safeRequiredCredits = clampNumber(requiredCredits, 0, 999999, 0);
  const missingCredits = Math.max(0, safeRequiredCredits - safeCurrentCredits);
  const messages = [];

  if (itemPlan.missing.length > 0) {
    messages.push(`Missing ${formatTradeLineItems(itemPlan.missing.map((lineItem) => ({ ...lineItem, quantity: lineItem.missing_quantity })))}`);
  }
  if (missingCredits > 0) {
    messages.push(`Missing ${missingCredits}c`);
  }

  return {
    ok: itemPlan.ok && missingCredits === 0,
    itemPlan,
    missingCredits,
    message: messages.join(" • "),
  };
}

export function canSatisfyTradeObligation({ inventoryItems, lineItems, currentCredits, requiredCredits }) {
  return describeTradeRequirementGap({
    inventoryItems,
    lineItems,
    currentCredits,
    requiredCredits,
  }).ok;
}

export function mapTradeOutcomeStatus(value) {
  const status = sanitizeText(value, 24);
  if (status === "accepted") {
    return "completed";
  }
  if (["completed", "rejected", "cancelled", "expired"].includes(status)) {
    return status;
  }
  return "cancelled";
}

export function buildPlayerTradeLedgerEntry({
  sourceType,
  sourceId,
  outcomeStatus,
  settlementMode,
  listingType = '',
  initiatorEmail,
  initiatorCallsign,
  counterpartyEmail,
  counterpartyCallsign,
  initiatorItems,
  counterpartyItems,
  initiatorCredits,
  counterpartyCredits,
  recordedAt,
  notes,
}) {
  return compactObject({
    source_type: sanitizeText(sourceType, 40),
    source_id: sanitizeText(sourceId, 120),
    outcome_status: mapTradeOutcomeStatus(outcomeStatus),
    settlement_mode: sanitizeText(settlementMode, 40) || "live",
    listing_type: sanitizeText(listingType, 24),
    initiator_email: sanitizeText(initiatorEmail, 160),
    initiator_callsign: sanitizeText(initiatorCallsign, 120),
    counterparty_email: sanitizeText(counterpartyEmail, 160),
    counterparty_callsign: sanitizeText(counterpartyCallsign, 120),
    initiator_items: (Array.isArray(initiatorItems) ? initiatorItems : []).map(normalizeLineItemSnapshot).filter(Boolean),
    counterparty_items: (Array.isArray(counterpartyItems) ? counterpartyItems : []).map(normalizeLineItemSnapshot).filter(Boolean),
    initiator_credits: clampNumber(initiatorCredits, 0, 999999, 0),
    counterparty_credits: clampNumber(counterpartyCredits, 0, 999999, 0),
    recorded_at: sanitizeText(recordedAt, 40) || new Date().toISOString(),
    notes: sanitizeText(notes, 400),
  });
}

export function buildPlayerTradeSourceKey(sourceType, sourceId) {
  const safeSourceType = sanitizeText(sourceType, 40);
  const safeSourceId = sanitizeText(sourceId, 120);
  return safeSourceType && safeSourceId ? `${safeSourceType}:${safeSourceId}` : '';
}

export function buildSyntheticLedgerEntryFromTradeOffer(record, options = {}) {
  const safeRecord = record && typeof record === 'object' ? record : {};
  return buildPlayerTradeLedgerEntry({
    sourceType: 'trade_offer',
    sourceId: safeRecord.id,
    outcomeStatus: safeRecord.status,
    settlementMode: 'synthetic_backfill',
    listingType: safeRecord.listing_type || safeRecord.type,
    initiatorEmail: safeRecord.seller_email,
    initiatorCallsign: safeRecord.seller_callsign || safeRecord.seller_email,
    counterpartyEmail: safeRecord.buyer_email,
    counterpartyCallsign: options.counterpartyCallsign || safeRecord.buyer_callsign || safeRecord.buyer_email,
    initiatorItems: safeRecord.offered_items,
    counterpartyItems: safeRecord.requested_items,
    initiatorCredits: safeRecord.offered_credits,
    counterpartyCredits: safeRecord.requested_credits,
    recordedAt: safeRecord.resolved_at || safeRecord.updated_date || safeRecord.created_date,
    notes: options.notes || 'Synthetic backfill from terminal TradeOffer record',
  });
}

export function buildSyntheticLedgerEntryFromTradeRequest(record, options = {}) {
  const safeRecord = record && typeof record === 'object' ? record : {};
  return buildPlayerTradeLedgerEntry({
    sourceType: 'trade_request',
    sourceId: safeRecord.id,
    outcomeStatus: safeRecord.status,
    settlementMode: 'synthetic_backfill',
    initiatorEmail: safeRecord.sender_email,
    initiatorCallsign: safeRecord.sender_callsign || safeRecord.sender_email,
    counterpartyEmail: safeRecord.receiver_email,
    counterpartyCallsign: safeRecord.receiver_callsign || safeRecord.receiver_email,
    initiatorItems: safeRecord.offered_items,
    counterpartyItems: safeRecord.requested_items,
    initiatorCredits: safeRecord.offered_credits,
    counterpartyCredits: safeRecord.requested_credits,
    recordedAt: safeRecord.resolved_at || safeRecord.updated_date || safeRecord.created_date,
    notes: options.notes || 'Synthetic backfill from terminal TradeRequest record',
  });
}
