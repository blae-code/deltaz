import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInventoryTransferPlan,
  buildPlayerTradeLedgerEntry,
  buildPlayerTradeSourceKey,
  buildSyntheticLedgerEntryFromTradeOffer,
  buildSyntheticLedgerEntryFromTradeRequest,
  describeTradeRequirementGap,
} from "../base44/functions/_shared/playerTradeSettlement.mjs";

test("buildInventoryTransferPlan prefers exact inventory rows and falls back to FIFO slug matching", () => {
  const inventory = [
    { id: "inv-1", name: "Scrap Metal", game_item_slug: "scrap-metal", quantity: 2, created_date: "2026-04-01T00:00:00.000Z" },
    { id: "inv-2", name: "Scrap Metal", game_item_slug: "scrap-metal", quantity: 4, created_date: "2026-04-02T00:00:00.000Z" },
    { id: "inv-3", name: "MedKit", game_item_slug: "medkit", quantity: 1, created_date: "2026-04-03T00:00:00.000Z" },
  ];

  const plan = buildInventoryTransferPlan(inventory, [
    { inventory_item_id: "inv-3", game_item_slug: "medkit", name: "MedKit", quantity: 1 },
    { game_item_slug: "scrap-metal", name: "Scrap Metal", quantity: 5 },
  ]);

  assert.equal(plan.ok, true);
  assert.equal(plan.missing.length, 0);
  assert.deepEqual(
    plan.allocations.map((allocation) => [allocation.inventory_item_id, allocation.quantity]),
    [
      ["inv-3", 1],
      ["inv-1", 2],
      ["inv-2", 3],
    ],
  );
});

test("describeTradeRequirementGap reports missing items and credits together", () => {
  const gap = describeTradeRequirementGap({
    inventoryItems: [
      { id: "inv-1", name: "Scrap Metal", game_item_slug: "scrap-metal", quantity: 1, created_date: "2026-04-01T00:00:00.000Z" },
    ],
    lineItems: [
      { game_item_slug: "scrap-metal", name: "Scrap Metal", quantity: 3 },
    ],
    currentCredits: 10,
    requiredCredits: 40,
  });

  assert.equal(gap.ok, false);
  assert.equal(gap.missingCredits, 30);
  assert.match(gap.message, /Missing 2x Scrap Metal/);
  assert.match(gap.message, /Missing 30c/);
});

test("buildPlayerTradeLedgerEntry preserves canonical trade snapshots", () => {
  const ledger = buildPlayerTradeLedgerEntry({
    sourceType: "trade_request",
    sourceId: "req-1",
    outcomeStatus: "completed",
    settlementMode: "live",
    initiatorEmail: "sender@example.com",
    initiatorCallsign: "SENDER",
    counterpartyEmail: "receiver@example.com",
    counterpartyCallsign: "RECEIVER",
    initiatorItems: [{ game_item_slug: "medkit", name: "MedKit", quantity: 1 }],
    counterpartyItems: [{ game_item_slug: "scrap-metal", name: "Scrap Metal", quantity: 4 }],
    initiatorCredits: 10,
    counterpartyCredits: 0,
    recordedAt: "2026-04-10T01:02:03.000Z",
    notes: "Live settlement via request acceptance",
  });

  assert.equal(ledger.source_type, "trade_request");
  assert.equal(ledger.outcome_status, "completed");
  assert.equal(ledger.initiator_items[0].game_item_slug, "medkit");
  assert.equal(ledger.counterparty_items[0].game_item_slug, "scrap-metal");
  assert.equal(ledger.recorded_at, "2026-04-10T01:02:03.000Z");
});

test("synthetic ledger builders emit stable source keys for idempotent backfill", () => {
  const offerLedger = buildSyntheticLedgerEntryFromTradeOffer({
    id: "offer-7",
    status: "accepted",
    listing_type: "offer",
    seller_email: "seller@example.com",
    seller_callsign: "SELLER",
    buyer_email: "buyer@example.com",
    offered_items: [{ game_item_slug: "medkit", name: "MedKit", quantity: 1 }],
    requested_items: [{ game_item_slug: "scrap-metal", name: "Scrap Metal", quantity: 2 }],
    offered_credits: 0,
    requested_credits: 25,
    resolved_at: "2026-04-08T00:00:00.000Z",
  });
  const requestLedger = buildSyntheticLedgerEntryFromTradeRequest({
    id: "request-9",
    status: "rejected",
    sender_email: "sender@example.com",
    sender_callsign: "SENDER",
    receiver_email: "receiver@example.com",
    receiver_callsign: "RECEIVER",
    offered_items: [{ game_item_slug: "medkit", name: "MedKit", quantity: 1 }],
    requested_items: [{ game_item_slug: "scrap-metal", name: "Scrap Metal", quantity: 2 }],
    offered_credits: 5,
    requested_credits: 0,
    resolved_at: "2026-04-09T00:00:00.000Z",
  });

  assert.equal(buildPlayerTradeSourceKey(offerLedger.source_type, offerLedger.source_id), "trade_offer:offer-7");
  assert.equal(buildPlayerTradeSourceKey(requestLedger.source_type, requestLedger.source_id), "trade_request:request-9");
  assert.equal(offerLedger.outcome_status, "completed");
  assert.equal(requestLedger.outcome_status, "rejected");
  assert.equal(offerLedger.settlement_mode, "synthetic_backfill");
  assert.equal(requestLedger.settlement_mode, "synthetic_backfill");
});
