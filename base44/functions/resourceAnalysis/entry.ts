import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * resourceAnalysis — AI-powered analysis of resource nodes, depletion forecasting,
 * harvesting strategy, and trade opportunity recommendations.
 * 
 * Returns: depletion forecasts, harvesting strategy, trade recommendations, risk alerts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gather all data needed for analysis
    const [territories, trades, transactions, colony, bases, commodities] = await Promise.all([
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.ResourceTrade.filter({ status: "open" }),
      base44.asServiceRole.entities.TradeTransaction.list("-created_date", 100),
      base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1).then(r => r[0] || null),
      base44.entities.PlayerBase.filter({ owner_email: user.email }),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
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
        });
      });
    });

    // Compute trade flow summary
    const tradeFlows = {};
    transactions.forEach(tx => {
      const key = tx.resource_sold;
      if (!tradeFlows[key]) tradeFlows[key] = { sold: 0, bought: 0, txCount: 0 };
      tradeFlows[key].sold += tx.quantity_sold || 0;
      tradeFlows[key].txCount++;
    });
    transactions.forEach(tx => {
      const key = tx.resource_paid;
      if (!tradeFlows[key]) tradeFlows[key] = { sold: 0, bought: 0, txCount: 0 };
      tradeFlows[key].bought += tx.quantity_paid || 0;
    });

    // Open listings summary
    const openByResource = {};
    trades.forEach(t => {
      const k = t.resource_offered;
      if (!openByResource[k]) openByResource[k] = { listings: 0, totalQty: 0 };
      openByResource[k].listings++;
      openByResource[k].totalQty += t.quantity_offered || 0;
    });

    // Colony resource snapshot
    const colonySnapshot = colony ? {
      food: colony.food_reserves ?? 0,
      water: colony.water_supply ?? 0,
      medical: colony.medical_supplies ?? 0,
      power: colony.power_level ?? 0,
      defense: colony.defense_integrity ?? 0,
      morale: colony.morale ?? 0,
    } : null;

    // Commodity prices
    const priceMap = {};
    commodities.forEach(c => {
      priceMap[c.resource_type] = {
        current: c.current_price,
        base: c.base_price,
        trend: c.price_trend,
        availability: c.availability,
      };
    });

    // Player base sectors
    const playerSectors = bases.map(b => b.sector).filter(Boolean);

    // AI Analysis
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a post-apocalyptic resource analyst AI. Analyze the following data and provide strategic recommendations.

RESOURCE NODES (${allNodes.length} total, ${allNodes.filter(n => n.depleted).length} depleted):
${JSON.stringify(allNodes.slice(0, 40), null, 1)}

COLONY RESOURCES: ${JSON.stringify(colonySnapshot)}

TRADE FLOWS (recent transactions): ${JSON.stringify(tradeFlows)}

OPEN BAZAAR LISTINGS: ${JSON.stringify(openByResource)}

COMMODITY PRICES: ${JSON.stringify(priceMap)}

PLAYER BASE SECTORS: ${JSON.stringify(playerSectors)}

Provide analysis with these sections:
1. depletion_forecasts: For each active resource type with nodes, estimate depletion risk (low/medium/high/critical), projected cycles remaining, and reasoning.
2. harvesting_strategy: Top 3-5 actionable recommendations for optimal resource gathering. Include which sectors to prioritize, which resources to focus on, and why.
3. trade_recommendations: Top 3-5 specific trade opportunities — what to sell (surplus/overpriced), what to buy (scarce/underpriced), and ideal exchange ratios based on current bazaar data.
4. risk_alerts: Any urgent risks — resources about to run out, nodes depleting faster than consumption, price manipulation, or supply chain vulnerabilities.
5. summary: A 2-sentence executive summary of the resource situation.

Be specific with sector codes, resource types, and quantities. Use the actual data.`,
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
      },
    });
  } catch (error) {
    console.error("resourceAnalysis error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});