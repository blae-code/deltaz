import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCatalogLookup,
  ensureStructuredTradeOffer,
  ensureStructuredTradeRequest,
  getInventoryCountForReference,
} from "../base44/functions/_shared/catalogIdentity.mjs";

const CATALOG = [
  {
    slug: "medkit",
    name: "MedKit",
    aliases: ["Med Kit", "Medical Kit"],
    category: "medical",
    inventory_category: "consumable",
    default_value: 40,
  },
  {
    slug: "scrap-metal",
    name: "Scrap Metal",
    aliases: [],
    category: "material",
    inventory_category: "material",
    default_value: 5,
  },
];

test("ensureStructuredTradeOffer normalizes legacy offer listings into canonical line items", () => {
  const lookup = buildCatalogLookup(CATALOG);
  const listing = ensureStructuredTradeOffer({
    type: "offer",
    item_name: "Med Kit",
    item_category: "consumable",
    quantity: 2,
    asking_items: "3x Scrap Metal",
    asking_price: 25,
  }, lookup);

  assert.equal(listing.listing_type, "offer");
  assert.equal(listing.offered_items[0].game_item_slug, "medkit");
  assert.equal(listing.offered_items[0].quantity, 2);
  assert.equal(listing.requested_items[0].game_item_slug, "scrap-metal");
  assert.equal(listing.requested_items[0].quantity, 3);
  assert.equal(listing.requested_credits, 25);
  assert.equal(listing.item_name, "MedKit");
});

test("ensureStructuredTradeRequest prefers canonical arrays and emits legacy compatibility snapshots", () => {
  const lookup = buildCatalogLookup(CATALOG);
  const request = ensureStructuredTradeRequest({
    offered_items: [{ name: "Med Kit", quantity: 1 }],
    requested_items: [{ name: "Scrap Metal", quantity: 4 }],
    offered_credits: 10,
    requested_credits: 0,
  }, lookup);

  assert.equal(request.offered_items[0].game_item_slug, "medkit");
  assert.equal(request.requested_items[0].game_item_slug, "scrap-metal");
  assert.equal(request.offer_items, "1x MedKit");
  assert.equal(request.request_items, "4x Scrap Metal");
  assert.equal(request.offer_credits, 10);
});

test("getInventoryCountForReference prefers canonical slug matching across renamed inventory records", () => {
  const inventory = [
    { name: "Medical Kit", game_item_slug: "medkit", quantity: 2 },
    { name: "MedKit", game_item_slug: "medkit", quantity: 1 },
    { name: "Scrap Metal", game_item_slug: "scrap-metal", quantity: 6 },
  ];

  assert.equal(getInventoryCountForReference(inventory, { game_item_slug: "medkit", name: "MedKit" }), 3);
  assert.equal(getInventoryCountForReference(inventory, { game_item_slug: "scrap-metal", name: "Scrap Metal" }), 6);
});
