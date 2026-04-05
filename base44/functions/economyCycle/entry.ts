import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const [economies, factions, territories, tradeRoutes] = await Promise.all([
    base44.asServiceRole.entities.FactionEconomy.filter({}),
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.TradeRoute.filter({}),
  ]);

  // Process active trade routes
  const activeRoutes = tradeRoutes.filter(r => r.status === 'active');
  const tradeResults = [];
  for (const route of activeRoutes) {
    const fromEco = economies.find(e => e.faction_id === route.from_faction_id);
    const toEco = economies.find(e => e.faction_id === route.to_faction_id);
    if (!fromEco || !toEco || fromEco.trade_embargo || toEco.trade_embargo) continue;

    const senderProd = (fromEco.resource_production || {})[route.resource_type] || 0;
    const adjustedProd = senderProd * (fromEco.supply_chain_modifier || 1);
    const tradeAmount = Math.min(route.amount, Math.floor(adjustedProd * 0.5));
    if (tradeAmount <= 0) continue;

    const totalCost = tradeAmount * route.price_per_unit;
    if ((toEco.wealth || 0) < totalCost) continue;

    // Apply trade wealth transfers directly to economy objects so they compound with cycle
    fromEco.wealth = (fromEco.wealth || 0) + totalCost;
    toEco.wealth = (toEco.wealth || 0) - totalCost;

    await base44.asServiceRole.entities.TradeRoute.update(route.id, {
      total_transferred: (route.total_transferred || 0) + tradeAmount,
      total_revenue: (route.total_revenue || 0) + totalCost,
      cycles_active: (route.cycles_active || 0) + 1,
    });
    tradeResults.push({ from: factions.find(f => f.id === route.from_faction_id)?.tag, to: factions.find(f => f.id === route.to_faction_id)?.tag, resource: route.resource_type, amount: tradeAmount, cost: totalCost });
  }

  const results = [];

  for (const econ of economies) {
    const faction = factions.find(f => f.id === econ.faction_id);
    if (!faction || faction.status !== 'active') continue;

    const factionTerritories = territories.filter(t => t.controlling_faction_id === econ.faction_id);
    const prod = econ.resource_production || {};
    const modifier = econ.supply_modifier || 1.0;
    const taxRate = econ.tax_rate || 0.1;

    // Calculate territory resource bonuses
    let territoryBonus = 0;
    for (const t of factionTerritories) {
      const res = t.resources || [];
      territoryBonus += res.length * 15;
      if (t.status === 'secured') territoryBonus += 10;
      if (t.status === 'contested') territoryBonus -= 5;
      if (t.status === 'hostile') territoryBonus -= 15;
    }

    // Total raw production
    const rawProd = Object.values(prod).reduce((s, v) => s + (v || 0), 0);
    const adjustedProd = Math.round(rawProd * modifier);
    const taxRevenue = Math.round(adjustedProd * taxRate);
    const totalIncome = adjustedProd + territoryBonus + taxRevenue;

    // Expenses
    const upkeep = econ.upkeep_cost || 100;
    const territoryUpkeep = factionTerritories.length * 25;
    const totalExpenses = upkeep + territoryUpkeep;

    const netChange = totalIncome - totalExpenses;
    const newWealth = Math.max(0, (econ.wealth || 0) + netChange);

    await base44.asServiceRole.entities.FactionEconomy.update(econ.id, {
      wealth: newWealth,
      last_cycle_income: totalIncome,
      last_cycle_expenses: totalExpenses,
    });

    results.push({
      faction: faction.name,
      income: totalIncome,
      expenses: totalExpenses,
      net: netChange,
      wealth: newWealth,
    });
  }

  // Broadcast economic report
  const tradeSummary = tradeResults.length > 0 ? ` | Trades: ${tradeResults.map(t => `${t.from}→${t.to}: ${t.amount} ${t.resource}`).join(', ')}` : '';
  if (results.length > 0) {
    const summary = results.map(r => `${r.faction}: ${r.net >= 0 ? '+' : ''}${r.net} (wealth: ${r.wealth})`).join(' | ');
    await base44.asServiceRole.entities.Event.create({
      title: 'Economic Cycle Complete',
      content: `Resource cycle processed. ${summary}${tradeSummary}`,
      type: 'system_alert',
      severity: 'info',
      is_active: true,
    });
  }

  return Response.json({ status: 'ok', results, trades_processed: tradeResults.length });
});