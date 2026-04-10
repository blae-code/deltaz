export function sanitizeText(value, maxLength = 160) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

export function normalizeGameText(value) {
  return sanitizeText(value, 200)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function slugifyCatalogValue(value) {
  return sanitizeText(value, 200)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function getCatalogDefaultValue(item) {
  if (!item || typeof item !== 'object') {
    return 0;
  }

  return Number(item.default_value ?? item.trade_value_player ?? item.trade_value_trader ?? 0) || 0;
}

export function buildCatalogLookup(records = []) {
  const bySlug = new Map();
  const byNormalizedName = new Map();

  for (const rawRecord of Array.isArray(records) ? records : []) {
    if (!rawRecord || typeof rawRecord !== 'object') {
      continue;
    }

    const slug = sanitizeText(rawRecord.slug, 160);
    if (slug) {
      bySlug.set(slug, rawRecord);
    }

    const registerName = (value) => {
      const normalized = normalizeGameText(value);
      if (!normalized || byNormalizedName.has(normalized)) {
        return;
      }
      byNormalizedName.set(normalized, rawRecord);
    };

    registerName(rawRecord.name);
    if (Array.isArray(rawRecord.aliases)) {
      for (const alias of rawRecord.aliases) {
        registerName(alias);
      }
    }
  }

  return { bySlug, byNormalizedName };
}

export function findCatalogItem(lookup, input = {}) {
  const slug = sanitizeText(input.game_item_slug || input.item_slug || input.slug, 160);
  if (slug && lookup?.bySlug?.has(slug)) {
    return lookup.bySlug.get(slug);
  }

  const normalizedName = normalizeGameText(input.name || input.resource || input.title);
  if (normalizedName && lookup?.byNormalizedName?.has(normalizedName)) {
    return lookup.byNormalizedName.get(normalizedName);
  }

  const fallbackSlug = slugifyCatalogValue(input.name || input.resource || input.title);
  if (fallbackSlug && lookup?.bySlug?.has(fallbackSlug)) {
    return lookup.bySlug.get(fallbackSlug);
  }

  return null;
}

export function buildInventorySnapshotFromCatalog(item, overrides = {}) {
  const name = sanitizeText(overrides.name || item?.name, 160);
  return {
    name,
    category: sanitizeText(overrides.category || item?.inventory_category || item?.category, 40) || 'misc',
    rarity: sanitizeText(overrides.rarity || item?.rarity, 24) || 'common',
    value: Number.isFinite(Number(overrides.value)) ? Number(overrides.value) : getCatalogDefaultValue(item),
    game_item_slug: sanitizeText(overrides.game_item_slug || item?.slug, 160),
  };
}

export function buildTradeLineItemFromInventoryItem(inventoryItem, quantity = 1, catalogItem = null) {
  const safeQuantity = clampNumber(quantity ?? inventoryItem?.quantity, 1, 999, 1);
  const resolvedCatalogItem = catalogItem || null;
  const snapshot = buildInventorySnapshotFromCatalog(resolvedCatalogItem, {
    name: inventoryItem?.name,
    category: inventoryItem?.category,
    rarity: inventoryItem?.rarity,
    value: inventoryItem?.value,
    game_item_slug: inventoryItem?.game_item_slug || resolvedCatalogItem?.slug,
  });

  return compactObject({
    game_item_slug: sanitizeText(snapshot.game_item_slug, 160),
    name: sanitizeText(snapshot.name || inventoryItem?.name, 160),
    quantity: safeQuantity,
    inventory_item_id: sanitizeText(inventoryItem?.id, 120),
    inventory_category: sanitizeText(inventoryItem?.category || snapshot.category, 40),
    condition: clampNumber(inventoryItem?.condition, 0, 100, 100),
    value: clampNumber(inventoryItem?.value ?? snapshot.value, 0, 999999, 0),
  });
}

export function normalizeTradeLineItem(input, lookup) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const catalogItem = findCatalogItem(lookup, input);
  const quantity = clampNumber(input.quantity, 1, 999, 1);
  const fallbackName = sanitizeText(input.name || input.resource, 160);
  const name = sanitizeText(catalogItem?.name || fallbackName, 160);
  if (!name) {
    return null;
  }

  return compactObject({
    game_item_slug: sanitizeText(input.game_item_slug || input.item_slug || catalogItem?.slug, 160),
    name,
    quantity,
    inventory_item_id: sanitizeText(input.inventory_item_id, 120),
    inventory_category: sanitizeText(input.inventory_category || input.category || catalogItem?.inventory_category || catalogItem?.category, 40),
    condition: input.condition == null ? undefined : clampNumber(input.condition, 0, 100, 100),
    value: input.value == null ? undefined : clampNumber(input.value, 0, 999999, 0),
  });
}

export function normalizeTradeLineItems(items, lookup) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => normalizeTradeLineItem(item, lookup))
    .filter(Boolean);
}

export function parseLegacyLineItems(text, lookup) {
  const source = sanitizeText(text, 1200);
  if (!source) {
    return [];
  }

  const parts = source
    .split(/[,;]+/)
    .map((entry) => sanitizeText(entry, 200))
    .filter(Boolean);

  return parts
    .map((entry) => {
      const leadingQty = entry.match(/^(\d+)\s*x\s+(.+)$/i);
      const trailingQty = entry.match(/^(.+?)\s+x\s*(\d+)$/i);

      let quantity = 1;
      let name = entry;

      if (leadingQty) {
        quantity = clampNumber(leadingQty[1], 1, 999, 1);
        name = sanitizeText(leadingQty[2], 160);
      } else if (trailingQty) {
        quantity = clampNumber(trailingQty[2], 1, 999, 1);
        name = sanitizeText(trailingQty[1], 160);
      }

      return normalizeTradeLineItem({ name, quantity }, lookup);
    })
    .filter(Boolean);
}

export function formatTradeLineItems(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  return normalizedItems
    .map((item) => {
      const quantity = clampNumber(item?.quantity, 1, 999, 1);
      const name = sanitizeText(item?.name, 160);
      if (!name) {
        return '';
      }
      return `${quantity}x ${name}`;
    })
    .filter(Boolean)
    .join(', ');
}

export function inferTradeOfferListingType(record) {
  const listingType = sanitizeText(record?.listing_type || record?.type, 24);
  if (listingType === 'offer' || listingType === 'want') {
    return listingType;
  }

  return 'offer';
}

export function deriveTradeOfferCompatibility(record) {
  const listingType = inferTradeOfferListingType(record);
  const offeredItems = Array.isArray(record?.offered_items) ? record.offered_items : [];
  const requestedItems = Array.isArray(record?.requested_items) ? record.requested_items : [];
  const primaryItems = listingType === 'offer' ? offeredItems : requestedItems;
  const counterpartyItems = listingType === 'offer' ? requestedItems : offeredItems;
  const primary = primaryItems[0] || {};

  return compactObject({
    listing_type: listingType,
    type: listingType,
    item_id: sanitizeText(primary.inventory_item_id, 120),
    item_name: primaryItems.length <= 1
      ? sanitizeText(primary.name, 160)
      : formatTradeLineItems(primaryItems),
    item_category: sanitizeText(primary.inventory_category, 40),
    quantity: clampNumber(primary.quantity, 1, 999, 1),
    asking_items: formatTradeLineItems(counterpartyItems),
    asking_price: clampNumber(
      listingType === 'offer' ? record?.requested_credits : record?.offered_credits,
      0,
      999999,
      0,
    ),
  });
}

export function deriveTradeRequestCompatibility(record) {
  return compactObject({
    offer_items: formatTradeLineItems(record?.offered_items),
    offer_credits: clampNumber(record?.offered_credits, 0, 999999, 0),
    request_items: formatTradeLineItems(record?.requested_items),
    request_credits: clampNumber(record?.requested_credits, 0, 999999, 0),
  });
}

export function ensureStructuredTradeOffer(record, lookup) {
  const listingType = inferTradeOfferListingType(record);
  const existingOfferedItems = normalizeTradeLineItems(record?.offered_items, lookup);
  const existingRequestedItems = normalizeTradeLineItems(record?.requested_items, lookup);

  let offeredItems = existingOfferedItems;
  let requestedItems = existingRequestedItems;
  let offeredCredits = clampNumber(record?.offered_credits, 0, 999999, 0);
  let requestedCredits = clampNumber(record?.requested_credits, 0, 999999, 0);

  if (offeredItems.length === 0 && requestedItems.length === 0) {
    if (listingType === 'offer') {
      offeredItems = normalizeTradeLineItems([
        {
          game_item_slug: record?.game_item_slug,
          name: record?.item_name,
          quantity: record?.quantity,
          inventory_item_id: record?.item_id,
          inventory_category: record?.item_category,
        },
      ], lookup).filter(Boolean);
      requestedItems = parseLegacyLineItems(record?.asking_items, lookup);
      requestedCredits = clampNumber(record?.asking_price, 0, 999999, 0);
    } else {
      requestedItems = normalizeTradeLineItems([
        {
          game_item_slug: record?.game_item_slug,
          name: record?.item_name,
          quantity: record?.quantity,
          inventory_category: record?.item_category,
        },
      ], lookup).filter(Boolean);
      offeredItems = parseLegacyLineItems(record?.asking_items, lookup);
      offeredCredits = clampNumber(record?.asking_price, 0, 999999, 0);
    }
  }

  return {
    listing_type: listingType,
    offered_items: offeredItems,
    requested_items: requestedItems,
    offered_credits: offeredCredits,
    requested_credits: requestedCredits,
    ...deriveTradeOfferCompatibility({
      listing_type: listingType,
      offered_items: offeredItems,
      requested_items: requestedItems,
      offered_credits: offeredCredits,
      requested_credits: requestedCredits,
    }),
  };
}

export function ensureStructuredTradeRequest(record, lookup) {
  const offeredItems = normalizeTradeLineItems(record?.offered_items, lookup);
  const requestedItems = normalizeTradeLineItems(record?.requested_items, lookup);

  const nextOfferedItems = offeredItems.length > 0 ? offeredItems : parseLegacyLineItems(record?.offer_items, lookup);
  const nextRequestedItems = requestedItems.length > 0 ? requestedItems : parseLegacyLineItems(record?.request_items, lookup);
  const offeredCredits = clampNumber(record?.offered_credits ?? record?.offer_credits, 0, 999999, 0);
  const requestedCredits = clampNumber(record?.requested_credits ?? record?.request_credits, 0, 999999, 0);

  return {
    offered_items: nextOfferedItems,
    requested_items: nextRequestedItems,
    offered_credits: offeredCredits,
    requested_credits: requestedCredits,
    ...deriveTradeRequestCompatibility({
      offered_items: nextOfferedItems,
      requested_items: nextRequestedItems,
      offered_credits: offeredCredits,
      requested_credits: requestedCredits,
    }),
  };
}

export function doesLineItemMatchInventoryItem(inventoryItem, lineItem) {
  if (!inventoryItem || !lineItem) {
    return false;
  }

  const inventorySlug = sanitizeText(inventoryItem.game_item_slug, 160);
  const lineSlug = sanitizeText(lineItem.game_item_slug, 160);
  if (inventorySlug && lineSlug) {
    return inventorySlug === lineSlug;
  }

  const left = normalizeGameText(inventoryItem.name);
  const right = normalizeGameText(lineItem.name);
  if (!left || !right) {
    return false;
  }

  return left === right || left.includes(right) || right.includes(left);
}

export function getInventoryCountForReference(inventoryItems, reference) {
  const items = Array.isArray(inventoryItems) ? inventoryItems : [];
  return items
    .filter((entry) => doesLineItemMatchInventoryItem(entry, reference))
    .reduce((sum, entry) => sum + clampNumber(entry?.quantity, 1, 999, 1), 0);
}

export function compactObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry == null || entry === '') {
      continue;
    }
    if (Array.isArray(entry) && entry.length === 0) {
      continue;
    }
    if (typeof entry === 'object' && !Array.isArray(entry)) {
      const nested = compactObject(entry);
      if (nested && Object.keys(nested).length > 0) {
        output[key] = nested;
      }
      continue;
    }
    output[key] = entry;
  }
  return output;
}
