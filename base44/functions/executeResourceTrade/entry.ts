import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * executeResourceTrade — accepts a trade listing and logs the transaction.
 * Payload: { trade_id, buyer_base_id }
 */

const COLONY_RESOURCE_MAP = {
  food: 'food_reserves',
  water: 'water_supply',
  medical: 'medical_supplies',
  power: 'power_level',
  defense_parts: 'defense_integrity',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trade_id, buyer_base_id } = await req.json();
    if (!trade_id || !buyer_base_id) {
      return Response.json({ error: 'trade_id and buyer_base_id are required' }, { status: 400 });
    }

    // Fetch trade listing
    const trades = await base44.asServiceRole.entities.ResourceTrade.filter({ id: trade_id });
    const trade = trades[0];
    if (!trade) {
      return Response.json({ error: 'Trade listing not found' }, { status: 404 });
    }
    if (trade.status !== 'open') {
      return Response.json({ error: `Trade is ${trade.status}, not open` }, { status: 400 });
    }
    if (trade.seller_email === user.email) {
      return Response.json({ error: 'Cannot accept your own trade listing' }, { status: 400 });
    }

    // Fetch buyer base
    const buyerBases = await base44.asServiceRole.entities.PlayerBase.filter({ id: buyer_base_id });
    const buyerBase = buyerBases[0];
    if (!buyerBase) {
      return Response.json({ error: 'Buyer base not found' }, { status: 404 });
    }
    if (buyerBase.owner_email !== user.email) {
      return Response.json({ error: 'You do not own this base' }, { status: 403 });
    }

    // Update colony status if the traded resources map to colony vitals
    // This is a lightweight simulation — GMs can adjust values manually
    const colonyList = await base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1);
    const colony = colonyList[0];

    if (colony) {
      const offeredField = COLONY_RESOURCE_MAP[trade.resource_offered];
      const requestedField = COLONY_RESOURCE_MAP[trade.resource_requested];

      const updates = {};
      // Buying resource → colony gains offered resource, loses requested resource
      if (offeredField) {
        const current = colony[offeredField] ?? 100;
        updates[offeredField] = Math.min(100, current + Math.round(trade.quantity_offered * 0.5));
      }
      if (requestedField) {
        const current = colony[requestedField] ?? 100;
        updates[requestedField] = Math.max(0, current - Math.round(trade.quantity_requested * 0.3));
      }

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.ColonyStatus.update(colony.id, updates);
      }
    }

    // Mark trade as completed
    await base44.asServiceRole.entities.ResourceTrade.update(trade.id, {
      status: 'completed',
      buyer_email: user.email,
      buyer_base_id: buyer_base_id,
      buyer_base_name: buyerBase.name,
    });

    // Log the transaction
    await base44.asServiceRole.entities.TradeTransaction.create({
      trade_id: trade.id,
      seller_email: trade.seller_email,
      seller_base_name: trade.seller_base_name,
      buyer_email: user.email,
      buyer_base_name: buyerBase.name,
      resource_sold: trade.resource_offered,
      quantity_sold: trade.quantity_offered,
      resource_paid: trade.resource_requested,
      quantity_paid: trade.quantity_requested,
      seller_type: trade.seller_type,
      npc_faction_name: trade.npc_faction_name || '',
      status: 'completed',
      notes: `Trade accepted by ${user.full_name || user.email}`,
    });

    return Response.json({ status: 'ok', message: 'Trade completed successfully' });
  } catch (error) {
    console.error('executeResourceTrade error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});