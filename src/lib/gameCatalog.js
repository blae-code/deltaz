import {
  buildCatalogLookup,
  buildInventorySnapshotFromCatalog,
  buildTradeLineItemFromInventoryItem,
  doesLineItemMatchInventoryItem,
  ensureStructuredTradeOffer,
  ensureStructuredTradeRequest,
  findCatalogItem,
  formatTradeLineItems,
  getCatalogDefaultValue,
  getInventoryCountForReference,
  normalizeGameText,
  sanitizeText,
} from "../../base44/functions/_shared/catalogIdentity.mjs";
import { describeTradeRequirementGap } from "../../base44/functions/_shared/playerTradeSettlement.mjs";

export { formatTradeLineItems, getCatalogDefaultValue, normalizeGameText };

export function createCatalogLookup(catalog) {
  return buildCatalogLookup(Array.isArray(catalog) ? catalog : []);
}

export function matchGameItemByName(catalog, value) {
  const lookup = createCatalogLookup(catalog);
  return findCatalogItem(lookup, { name: value });
}

export function matchGameItemBySlug(catalog, value) {
  const lookup = createCatalogLookup(catalog);
  return findCatalogItem(lookup, { game_item_slug: value });
}

export function buildInventoryRecordFromCatalog(item, overrides = {}) {
  const snapshot = buildInventorySnapshotFromCatalog(item, overrides);
  return {
    name: snapshot.name,
    game_item_slug: snapshot.game_item_slug,
    category: snapshot.category || overrides.category || "misc",
    value: snapshot.value,
    rarity: snapshot.rarity || overrides.rarity || "common",
    ...overrides,
  };
}

export function buildTradeLineItemFromCatalog(item, quantity = 1, overrides = {}) {
  return {
    game_item_slug: sanitizeText(overrides.game_item_slug || item?.slug, 160),
    name: sanitizeText(overrides.name || item?.name, 160),
    quantity: Math.max(1, Number(quantity) || 1),
    inventory_category: sanitizeText(overrides.inventory_category || item?.inventory_category || item?.category, 40) || "misc",
    value: Number.isFinite(Number(overrides.value)) ? Number(overrides.value) : getCatalogDefaultValue(item),
  };
}

export function buildTradeLineItemFromInventory(item, quantity = 1, catalog = []) {
  const matched = findCatalogItem(createCatalogLookup(catalog), item || {});
  return buildTradeLineItemFromInventoryItem(item, quantity, matched);
}

export function getInventoryCountForLineItem(inventory, lineItem) {
  return getInventoryCountForReference(inventory, lineItem);
}

export function describeTradeFulfillmentGap(inventory, lineItems = [], currentCredits = 0, requiredCredits = 0) {
  return describeTradeRequirementGap({
    inventoryItems: Array.isArray(inventory) ? inventory : [],
    lineItems: Array.isArray(lineItems) ? lineItems : [],
    currentCredits,
    requiredCredits,
  });
}

export function canFulfillTradeRequirements(inventory, lineItems = [], currentCredits = 0, requiredCredits = 0) {
  return describeTradeFulfillmentGap(inventory, lineItems, currentCredits, requiredCredits).ok;
}

export function doesInventoryMatchResource(itemOrName, resourceReference) {
  const inventoryItem = typeof itemOrName === "string"
    ? { name: itemOrName }
    : itemOrName;
  const target = typeof resourceReference === "string"
    ? { name: resourceReference }
    : resourceReference;
  return doesLineItemMatchInventoryItem(inventoryItem, target);
}

export function getStructuredTradeOffer(record, catalog = []) {
  return ensureStructuredTradeOffer(record, createCatalogLookup(catalog));
}

export function getStructuredTradeRequest(record, catalog = []) {
  return ensureStructuredTradeRequest(record, createCatalogLookup(catalog));
}
