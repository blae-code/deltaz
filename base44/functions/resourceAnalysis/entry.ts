import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * resourceAnalysis v2 — Enhanced AI-powered resource intelligence:
 * - Depletion forecasts & harvesting strategy
 * - Optimal harvest timing based on node depletion + player activity
 * - Proactive trade offer generation based on colony needs + market trends
 * - Monopoly detection & supply chain risk analysis across all players
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gather all data needed for analysis
    const [
      territories, trades, transactions, colony, playerBases,
      commodities, allBases, survivors, factionEcons, resourceHistory,
    ] = await Promise.all([
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.ResourceTrade.filter({ status: "open" }),
      base44.asServiceRole.entities.TradeTransaction.list("-created_date", 100),
      base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1).then(r => r[0] || null),
      base44.entities.PlayerBase.filter({ owner_email: user.email }),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
      base44.asServiceRole.entities.PlayerBase.filter({}),
      base44.asServiceRole.entities.Survivor.filter({ status: "active" }),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.ResourceHistory.list("-created_date", 50),
    ]);

    // Extract resource node data
    const allNodes = [];
    territories.forEach(t => {
      (t.resource_nodes || []).forEach(node => {
        allNodes.push({
          sector: t.sector,
          territory_name: t.name,
          type: node.type,
          yield_rate: node.yield_rate || 0,
          depleted: node.depleted || false,
          territory_threat: t.threat_level,
          territory_status: t.status,
          influence: t.influence_level || 0,
          defense: t.defense_power || 0,
          controlling_faction: t.controlling_faction_id || null,
        });
      });
    });

    // Trade flow summary
    const tradeFlows = {};
    transactions.forEach(tx => {
      const key = tx.resource_sold;
      if (!tradeFlows[key]) tradeFlows[key] = { sold: 0, bought: 0, txCount: 0, sellers: new Set(), buyers: new Set() };
      tradeFlows[key].sold += tx.quantity_sold || 0;
      tradeFlows[key].txCount++;
      if (tx.seller_email) tradeFlows[key].sellers.add(tx.seller_email);
    });
    transactions.forEach(tx => {
      const key = tx.resource_paid;
      if (!tradeFlows[key]) tradeFlows[key] = { sold: 0, bought: 0, txCount: 0, sellers: new Set(), buyers: new Set() };
      tradeFlows[key].bought += tx.quantity_paid || 0;
      if (tx.buyer_email) tradeFlows[key].buyers.add(tx.buyer_email);
    });
    // Serialize sets
    const tradeFlowsSerialized = {};
    for (const [k, v] of Object.entries(tradeFlows)) {
      tradeFlowsSerialized[k] = { sold: v.sold, bought: v.bought, txCount: v.txCount, unique_sellers: v.sellers.size, unique_buyers: v.buyers.size };
    }

    // Open listings summary with seller concentration
    const openByResource = {};
    const sellerListings = {};
    trades.forEach(t => {
      const k = t.resource_offered;
      if (!openByResource[k]) openByResource[k] = { listings: 0, totalQty: 0, sellers: new Set() };
      openByResource[k].listings++;
      openByResource[k].totalQty += t.quantity_offered || 0;
      openByResource[k].sellers.add(t.seller_email || t.npc_faction_name || 'unknown');

      const seller = t.seller_email || t.npc_faction_name || 'unknown';
      if (!sellerListings[seller]) sellerListings[seller] = { total: 0, resources: {} };
      sellerListings[seller].total++;
      sellerListings[seller].resources[k] = (sellerListings[seller].resources[k] || 0) + (t.quantity_offered || 0);
    });
    const openSerialized = {};
    for (const [k, v] of Object.entries(openByResource)) {
      openSerialized[k] = { listings: v.listings, totalQty: v.totalQty, unique_sellers: v.sellers.size };
    }

    // Colony resource snapshot
    const colonySnapshot = colony ? {
      food: colony.food_reserves ?? 0,
      water: colony.water_supply ?? 0,
      medical: colony.medical_supplies ?? 0,
      power: colony.power_level ?? 0,
      defense: colony.defense_integrity ?? 0,
      morale: colony.morale ?? 0,
      population: colony.population ?? 0,
    } : null;

    // Commodity prices with history
    const priceMap = {};
    commodities.forEach(c => {
      priceMap[c.resource_type] = {
        current: c.current_price,
        base: c.base_price,
        previous: c.previous_price,
        trend: c.price_trend,
        availability: c.availability,
        price_history: (c.price_history || []).slice(0, 10),
        diplomacy_mod: c.diplomacy_modifier || 0,
        supply_mod: c.supply_modifier || 0,
        demand_mod: c.demand_modifier || 0,
      };
    });

    // Player activity — who is scavenging/farming where
    const harvesters = survivors.filter(s =>
      ['scavenge', 'farm'].includes(s.current_task)
    );
    const harvestersByBase = {};
    harvesters.forEach(s => {
      const base = allBases.find(b => b.id === s.base_id);
      if (base?.sector) {
        if (!harvestersByBase[base.sector]) harvestersByBase[base.sector] = [];
        harvestersByBase[base.sector].push({
          name: s.nickname || s.name,
          task: s.current_task,
          skill: s.skill,
          skill_level: s.skill_level || 1,
        });
      }
    });

    // Per-base resource control for monopoly analysis
    const baseResourceControl = {};
    allBases.filter(b => b.status === 'active').forEach(base => {
      const sector = base.sector;
      const territory = territories.find(t => t.sector === sector);
      if (!territory) return;
      const nodes = (territory.resource_nodes || []).filter(n => !n.depleted);
      const owner = base.owner_email || 'unknown';
      if (!baseResourceControl[owner]) baseResourceControl[owner] = { bases: 0, sectors: [], resources: {} };
      baseResourceControl[owner].bases++;
      baseResourceControl[owner].sectors.push(sector);
      nodes.forEach(n => {
        baseResourceControl[owner].resources[n.type] = (baseResourceControl[owner].resources[n.type] || 0) + (n.yield_rate || 1);
      });
    });

    // Resource change velocity from history
    const resourceVelocity = {};
    resourceHistory.forEach(rh => {
      const key = rh.resource;
      if (!resourceVelocity[key]) resourceVelocity[key] = { changes: 0, totalDelta: 0 };
      resourceVelocity[key].changes++;
      resourceVelocity[key].totalDelta += rh.delta || 0;
    });

    const playerSectors = playerBases.map(b => b.sector).filter(Boolean);

    // AI Analysis — enhanced prompt
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an advanced post-apocalyptic resource intelligence AI. Perform a comprehensive analysis.

═══ RESOURCE NODES (${allNodes.length} total, ${allNodes.filter(n => n.depleted).length} depleted) ═══
${JSON.stringify(allNodes.slice(0, 50), null, 1)}

═══ COLONY RESOURCES ═══
${JSON.stringify(colonySnapshot)}

═══ RESOURCE CHANGE VELOCITY (recent history) ═══
${JSON.stringify(resourceVelocity)}

═══ ACTIVE HARVESTERS BY SECTOR ═══
${JSON.stringify(harvestersByBase)}

═══ TRADE FLOWS (recent transactions with seller/buyer diversity) ═══
${JSON.stringify(tradeFlowsSerialized)}

═══ OPEN BAZAAR LISTINGS (with seller concentration) ═══
${JSON.stringify(openSerialized)}

═══ TOP SELLERS IN BAZAAR ═══
${JSON.stringify(Object.entries(sellerListings).sort((a, b) => b[1].total - a[1].total).slice(0, 8).map(([k, v]) => ({ seller: k, ...v })))}

═══ COMMODITY PRICES (with modifiers and history) ═══
${JSON.stringify(priceMap)}

═══ PLAYER RESOURCE CONTROL (who controls what) ═══
${JSON.stringify(baseResourceControl)}

═══ PLAYER'S OWN SECTORS: ${JSON.stringify(playerSectors)} ═══

Provide analysis in these sections:

1. **depletion_forecasts**: Per active resource type — risk_level (low/medium/high/critical), cycles_remaining, active_nodes, depleted_nodes, reasoning.

2. **harvesting_strategy**: Top 5 actionable recommendations — priority, action, sector, resource, reasoning.

3. **harvest_timing**: For the top 5 most valuable resource nodes, predict OPTIMAL HARVEST WINDOWS:
   - resource, sector, current_yield_rate
   - optimal_timing: when to harvest (now/soon/wait/avoid) based on depletion risk, current harvester congestion, and threat level
   - congestion_level: how many harvesters are already active in the sector (low/medium/high)
   - depletion_risk: if harvesting now accelerates depletion dangerously
   - competitor_activity: are other players already harvesting here?
   - recommendation: specific advice (e.g. "Harvest now before node depletes in ~3 cycles" or "Wait — 4 scavengers already active, yield diminished")

4. **proactive_trades**: Generate 3-5 SPECIFIC trade offers the player should create in the Bazaar RIGHT NOW based on colony needs, price trends, and predicted market shifts:
   - offer_type: "sell" or "buy"
   - resource_offered / resource_requested, quantity, exchange_ratio
   - reasoning: why this trade makes sense now (e.g. "Food price rising 20%, sell surplus before demand peaks" or "Medical supplies scarce — buy now before price spikes")
   - urgency: low/medium/high/critical
   - predicted_fill_chance: how likely someone will accept (low/medium/high)

5. **monopoly_risks**: Identify potential resource monopolies or supply chain vulnerabilities:
   - type: "monopoly" | "supply_bottleneck" | "price_manipulation" | "single_point_failure"
   - severity: low/medium/high/critical
   - player_or_faction: who controls the resource or bottleneck
   - resource_affected: which resource
   - detail: explain the risk and its colony-wide impact
   - mitigation: what can be done about it

6. **trade_recommendations**: Top 5 existing trade opportunities — type (buy/sell), resource, action, reasoning, urgency.

7. **risk_alerts**: Urgent risks — severity, title, detail.

8. **summary**: 3-sentence executive summary covering the resource situation, market outlook, and most urgent action.

Be specific with sector codes, actual names, resource types, quantities, and prices.`,
      response_json_schema: {
        type: "object",
        properties: {
          depletion_forecasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                resource: { type: "string" },
                risk_level: { type: "string" },
                cycles_remaining: { type: "number" },
                active_nodes: { type: "number" },
                depleted_nodes: { type: "number" },
                reasoning: { type: "string" },
              },
            },
          },
          harvesting_strategy: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "number" },
                action: { type: "string" },
                sector: { type: "string" },
                resource: { type: "string" },
                reasoning: { type: "string" },
              },
            },
          },
          harvest_timing: {
            type: "array",
            items: {
              type: "object",
              properties: {
                resource: { type: "string" },
                sector: { type: "string" },
                current_yield_rate: { type: "number" },
                optimal_timing: { type: "string" },
                congestion_level: { type: "string" },
                depletion_risk: { type: "string" },
                competitor_activity: { type: "string" },
                recommendation: { type: "string" },
              },
            },
          },
          proactive_trades: {
            type: "array",
            items: {
              type: "object",
              properties: {
                offer_type: { type: "string" },
                resource_offered: { type: "string" },
                resource_requested: { type: "string" },
                quantity: { type: "number" },
                exchange_ratio: { type: "string" },
                reasoning: { type: "string" },
                urgency: { type: "string" },
                predicted_fill_chance: { type: "string" },
              },
            },
          },
          monopoly_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                severity: { type: "string" },
                player_or_faction: { type: "string" },
                resource_affected: { type: "string" },
                detail: { type: "string" },
                mitigation: { type: "string" },
              },
            },
          },
          trade_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                resource: { type: "string" },
                action: { type: "string" },
                reasoning: { type: "string" },
                urgency: { type: "string" },
              },
            },
          },
          risk_alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string" },
                title: { type: "string" },
                detail: { type: "string" },
              },
            },
          },
          summary: { type: "string" },
        },
      },
    });

    return Response.json({
      status: "ok",
      analysis,
      meta: {
        total_nodes: allNodes.length,
        depleted_nodes: allNodes.filter(n => n.depleted).length,
        active_nodes: allNodes.filter(n => !n.depleted).length,
        open_listings: trades.length,
        recent_transactions: transactions.length,
        active_harvesters: harvesters.length,
        tracked_players: Object.keys(baseResourceControl).length,
      },
    });
  } catch (error) {
    console.error("resourceAnalysis v2 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});