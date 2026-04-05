import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin manual trigger and scheduled/entity automations
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (_) {
      // Automation context — no user, proceed
    }

    const RESOURCE_TYPES = ['fuel', 'metals', 'tech', 'food', 'munitions'];
    const BASE_PRICES = { fuel: 12, metals: 15, tech: 25, food: 8, munitions: 20 };

    const [commodities, diplomacy, factions, economies, tradeRoutes, territories] = await Promise.all([
      base44.asServiceRole.entities.CommodityPrice.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.TradeRoute.filter({ status: 'active' }),
      base44.asServiceRole.entities.Territory.filter({}),
    ]);

    // Initialize missing commodities
    const existingTypes = commodities.map(c => c.resource_type);
    for (const rt of RESOURCE_TYPES) {
      if (!existingTypes.includes(rt)) {
        const created = await base44.asServiceRole.entities.CommodityPrice.create({
          resource_type: rt,
          base_price: BASE_PRICES[rt],
          current_price: BASE_PRICES[rt],
          availability: 'normal',
          price_trend: 'stable',
          diplomacy_modifier: 0,
          supply_modifier: 0,
          demand_modifier: 0,
          previous_price: BASE_PRICES[rt],
          price_history: [BASE_PRICES[rt]],
          notes: 'Market initialized.',
        });
        commodities.push(created);
      }
    }

    // === DIPLOMACY MODIFIER ===
    // Trade agreements and alliances reduce prices; wars increase them
    const diplomacyEffect = {};
    RESOURCE_TYPES.forEach(rt => { diplomacyEffect[rt] = 0; });

    for (const d of diplomacy) {
      const fA = factions.find(f => f.id === d.faction_a_id);
      const fB = factions.find(f => f.id === d.faction_b_id);
      if (!fA || !fB) continue;

      const ecoA = economies.find(e => e.faction_id === fA.id);
      const ecoB = economies.find(e => e.faction_id === fB.id);

      // Identify primary resources each faction produces
      const getPrimaryResources = (eco) => {
        if (!eco?.resource_production) return [];
        const prod = eco.resource_production;
        return Object.entries(prod)
          .filter(([_, v]) => v >= 5)
          .map(([k]) => k);
      };

      const resourcesA = getPrimaryResources(ecoA);
      const resourcesB = getPrimaryResources(ecoB);
      const sharedResources = [...new Set([...resourcesA, ...resourcesB])];

      if (d.status === 'trade_agreement' || d.status === 'allied') {
        // Trade agreements lower price of shared resources
        const discount = d.status === 'allied' ? -0.20 : -0.15;
        sharedResources.forEach(r => {
          diplomacyEffect[r] = (diplomacyEffect[r] || 0) + discount;
        });
      } else if (d.status === 'war') {
        // War increases price of all resources involved factions produce
        sharedResources.forEach(r => {
          diplomacyEffect[r] = (diplomacyEffect[r] || 0) + 0.25;
        });
      } else if (d.status === 'hostile') {
        sharedResources.forEach(r => {
          diplomacyEffect[r] = (diplomacyEffect[r] || 0) + 0.10;
        });
      }
      // ceasefire and neutral have no effect
    }

    // === SUPPLY MODIFIER ===
    // More active trade routes for a resource = more supply = lower price
    const supplyEffect = {};
    RESOURCE_TYPES.forEach(rt => { supplyEffect[rt] = 0; });

    for (const route of tradeRoutes) {
      if (route.resource_type && route.amount > 0) {
        supplyEffect[route.resource_type] = (supplyEffect[route.resource_type] || 0) - 0.05;
      }
    }

    // Total faction production also affects supply
    for (const eco of economies) {
      if (!eco.resource_production) continue;
      for (const [res, amount] of Object.entries(eco.resource_production)) {
        if (amount >= 10) {
          supplyEffect[res] = (supplyEffect[res] || 0) - 0.03;
        }
      }
    }

    // === DEMAND MODIFIER ===
    // Contested/hostile territories increase demand for munitions/fuel
    const contested = territories.filter(t => t.status === 'contested' || t.status === 'hostile').length;
    const demandEffect = {};
    RESOURCE_TYPES.forEach(rt => { demandEffect[rt] = 0; });

    if (contested > 0) {
      demandEffect.munitions += contested * 0.05;
      demandEffect.fuel += contested * 0.03;
    }

    // Embargoed factions increase demand for their blocked resources
    for (const eco of economies) {
      if (eco.trade_embargo) {
        const prod = eco.resource_production || {};
        for (const [res, amount] of Object.entries(prod)) {
          if (amount > 0) {
            demandEffect[res] = (demandEffect[res] || 0) + 0.08;
          }
        }
      }
    }

    // === CALCULATE FINAL PRICES ===
    const results = [];
    for (const commodity of commodities) {
      const rt = commodity.resource_type;
      if (!RESOURCE_TYPES.includes(rt)) continue;

      const basePrice = BASE_PRICES[rt] || commodity.base_price;
      const dipMod = Math.max(-0.50, Math.min(0.50, diplomacyEffect[rt] || 0));
      const supMod = Math.max(-0.40, Math.min(0.20, supplyEffect[rt] || 0));
      const demMod = Math.max(-0.10, Math.min(0.40, demandEffect[rt] || 0));

      const totalModifier = 1 + dipMod + supMod + demMod;
      const newPrice = Math.max(1, Math.round(basePrice * totalModifier * 100) / 100);
      const previousPrice = commodity.current_price || basePrice;

      // Determine trend
      let trend = 'stable';
      if (newPrice > previousPrice * 1.02) trend = 'rising';
      else if (newPrice < previousPrice * 0.98) trend = 'falling';

      // Determine availability
      const supplyScore = (supMod * -1) + (dipMod * -1); // Higher supply = positive
      let availability = 'normal';
      if (supplyScore > 0.15) availability = 'surplus';
      else if (supplyScore > 0.05) availability = 'high';
      else if (supplyScore < -0.15) availability = 'scarce';
      else if (supplyScore < -0.05) availability = 'low';

      // Price history (keep last 10)
      const history = [...(commodity.price_history || []), newPrice].slice(-10);

      await base44.asServiceRole.entities.CommodityPrice.update(commodity.id, {
        current_price: newPrice,
        previous_price: previousPrice,
        price_trend: trend,
        availability,
        diplomacy_modifier: Math.round(dipMod * 100),
        supply_modifier: Math.round(supMod * 100),
        demand_modifier: Math.round(demMod * 100),
        price_history: history,
      });

      results.push({ resource: rt, price: newPrice, trend, availability, dipMod, supMod, demMod });
    }

    // Generate market commentary
    const commentary = results.map(r =>
      `${r.resource.toUpperCase()}: ${r.price} CR (${r.trend}, ${r.availability}) [dip:${r.dipMod > 0 ? '+' : ''}${Math.round(r.dipMod * 100)}% sup:${r.supMod > 0 ? '+' : ''}${Math.round(r.supMod * 100)}% dem:${r.demMod > 0 ? '+' : ''}${Math.round(r.demMod * 100)}%]`
    ).join(' | ');

    await base44.asServiceRole.entities.Event.create({
      title: 'COMMODITY EXCHANGE: Market prices updated',
      content: commentary,
      type: 'system_alert',
      severity: 'info',
      is_active: true,
    });

    return Response.json({ status: 'ok', commodities: results });
  } catch (err) {
    console.error('Commodity engine error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
