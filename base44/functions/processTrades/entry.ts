import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const [routes, economies, factions] = await Promise.all([
    base44.asServiceRole.entities.TradeRoute.filter({}),
    base44.asServiceRole.entities.FactionEconomy.filter({}),
    base44.asServiceRole.entities.Faction.filter({}),
  ]);

  const activeRoutes = routes.filter(r => r.status === 'active');
  const results = [];

  for (const route of activeRoutes) {
    const fromEco = economies.find(e => e.faction_id === route.from_faction_id);
    const toEco = economies.find(e => e.faction_id === route.to_faction_id);
    const fromFaction = factions.find(f => f.id === route.from_faction_id);
    const toFaction = factions.find(f => f.id === route.to_faction_id);

    if (!fromEco || !toEco) continue;

    // Check embargo
    if (fromEco.trade_embargo || toEco.trade_embargo) {
      results.push({ route: route.id, status: 'blocked', reason: 'trade embargo' });
      continue;
    }

    // Check if sender has enough production
    const senderProd = (fromEco.resource_production || {})[route.resource_type] || 0;
    const adjustedProd = senderProd * (fromEco.supply_chain_modifier || 1);
    const tradeAmount = Math.min(route.amount, Math.floor(adjustedProd * 0.5)); // Can't trade more than 50% of production

    if (tradeAmount <= 0) {
      results.push({ route: route.id, status: 'skipped', reason: 'insufficient production' });
      continue;
    }

    const totalCost = tradeAmount * route.price_per_unit;

    // Check buyer can afford
    if ((toEco.wealth || 0) < totalCost) {
      results.push({ route: route.id, status: 'skipped', reason: 'buyer insufficient funds' });
      continue;
    }

    // Execute trade: transfer wealth
    await base44.asServiceRole.entities.FactionEconomy.update(fromEco.id, {
      wealth: (fromEco.wealth || 0) + totalCost,
    });

    await base44.asServiceRole.entities.FactionEconomy.update(toEco.id, {
      wealth: (toEco.wealth || 0) - totalCost,
    });

    // Update route stats
    await base44.asServiceRole.entities.TradeRoute.update(route.id, {
      total_transferred: (route.total_transferred || 0) + tradeAmount,
      total_revenue: (route.total_revenue || 0) + totalCost,
      cycles_active: (route.cycles_active || 0) + 1,
    });

    results.push({
      route: route.id,
      status: 'executed',
      from: fromFaction?.tag,
      to: toFaction?.tag,
      resource: route.resource_type,
      amount: tradeAmount,
      cost: totalCost,
    });
  }

  // Broadcast trade summary if any trades executed
  const executed = results.filter(r => r.status === 'executed');
  if (executed.length > 0) {
    const summary = executed.map(r => `${r.from}→${r.to}: ${r.amount} ${r.resource} (${r.cost} credits)`).join(', ');
    await base44.asServiceRole.entities.Event.create({
      title: `TRADE CYCLE: ${executed.length} route(s) processed`,
      content: summary,
      type: 'system_alert',
      severity: 'info',
      is_active: true,
    });
  }

  return Response.json({ status: 'ok', processed: results.length, executed: executed.length, results });
});