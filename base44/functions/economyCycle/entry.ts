import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const [economies, factions, territories] = await Promise.all([
    base44.asServiceRole.entities.FactionEconomy.filter({}),
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
  ]);

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
    const tradeIncome = econ.trade_balance || 0;
    const totalIncome = adjustedProd + territoryBonus + tradeIncome + taxRevenue;

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
  if (results.length > 0) {
    const summary = results.map(r => `${r.faction}: ${r.net >= 0 ? '+' : ''}${r.net} (wealth: ${r.wealth})`).join(' | ');
    await base44.asServiceRole.entities.Event.create({
      title: 'Economic Cycle Complete',
      content: `Resource cycle processed. ${summary}`,
      type: 'system_alert',
      severity: 'info',
      is_active: true,
    });
  }

  return Response.json({ status: 'ok', results });
});