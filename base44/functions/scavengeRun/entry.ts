import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { territory_id } = await req.json();
  if (!territory_id) return Response.json({ error: 'territory_id required' }, { status: 400 });

  // Check cooldown — 1 active run per player at a time
  const activeRuns = await base44.entities.ScavengeRun.filter({ player_email: user.email, status: 'in_progress' });
  if (activeRuns.length > 0) {
    return Response.json({ error: 'You already have an active scavenge run. Wait for it to complete.' }, { status: 429 });
  }

  // Gather world state
  const [territories, factions, commodities, diplomacyList] = await Promise.all([
    base44.entities.Territory.filter({}),
    base44.entities.Faction.filter({}),
    base44.entities.CommodityPrice.filter({}),
    base44.entities.Diplomacy.filter({}),
  ]);

  const territory = territories.find(t => t.id === territory_id);
  if (!territory) return Response.json({ error: 'Territory not found' }, { status: 404 });

  const controller = factions.find(f => f.id === territory.controlling_faction_id);

  // Build scarcity context
  const scarceResources = commodities
    .filter(c => c.availability === 'scarce' || c.availability === 'low')
    .map(c => c.resource_type);
  const surplusResources = commodities
    .filter(c => c.availability === 'surplus' || c.availability === 'high')
    .map(c => c.resource_type);

  // Create the run record in deploying state
  const run = await base44.entities.ScavengeRun.create({
    player_email: user.email,
    territory_id,
    status: 'in_progress',
    threat_level: territory.threat_level || 'moderate',
    controlling_faction: controller?.name || 'Unclaimed',
  });

  // Use AI to generate loot
  const prompt = `You are the loot engine for DEAD SIGNAL, a post-apocalyptic survival game. A scout has been deployed to scavenge a territory.

TERRITORY: "${territory.name}" (Sector ${territory.sector})
THREAT LEVEL: ${territory.threat_level || 'moderate'}
STATUS: ${territory.status || 'uncharted'}
CONTROLLING FACTION: ${controller?.name || 'None (unclaimed)'}
TERRITORY RESOURCES: ${(territory.resources || []).join(', ') || 'unknown'}

MARKET CONDITIONS:
- Scarce resources (worth more): ${scarceResources.join(', ') || 'none'}
- Surplus resources (worth less): ${surplusResources.join(', ') || 'none'}

RULES:
1. Higher threat = better loot BUT higher chance of a risk event (ambush, trap, contamination)
2. Faction-controlled territory: loot should reflect that faction's resources and tech level
3. Scarce resources should appear rarely but be high-value; surplus resources appear commonly but low-value
4. Territory resources should heavily influence what's found
5. Generate 3-6 loot items with realistic post-apocalyptic names
6. Each item needs: name, quantity (1-10), rarity (common/uncommon/rare/legendary), value (credits, 5-500 range)
7. Total value should scale with threat: minimal=30-80, low=50-120, moderate=80-200, high=150-350, critical=250-500
8. Generate a loot_summary: 2-3 sentences of atmospheric narrative describing the scavenge
9. 40% chance of a risk_event for moderate, 60% for high, 80% for critical, 10% for minimal/low
10. Risk events reduce total loot by ~30% and add dramatic flavor
11. Be creative, gritty, darkly humorous`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        loot_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              rarity: { type: 'string' },
              value: { type: 'number' }
            }
          }
        },
        loot_summary: { type: 'string' },
        risk_event: { type: 'string' },
        had_complication: { type: 'boolean' },
        total_value: { type: 'number' }
      }
    }
  });

  const totalValue = result.total_value || (result.loot_items || []).reduce((s, i) => s + (i.value || 0) * (i.quantity || 1), 0);

  // Update the run with results
  await base44.entities.ScavengeRun.update(run.id, {
    status: 'completed',
    loot_items: result.loot_items || [],
    loot_summary: result.loot_summary || 'Scout returned with supplies.',
    risk_event: result.had_complication ? (result.risk_event || '') : '',
    total_value: totalValue,
    duration_minutes: Math.floor(Math.random() * 30) + 15,
  });

  // Notify the player
  await base44.entities.Notification.create({
    player_email: user.email,
    title: `Scavenge complete: ${territory.name}`,
    message: `${result.loot_summary} Total value: ${totalValue} credits.`,
    type: 'mission_update',
    priority: result.had_complication ? 'high' : 'normal',
  });

  return Response.json({
    status: 'completed',
    run_id: run.id,
    loot_items: result.loot_items,
    loot_summary: result.loot_summary,
    risk_event: result.had_complication ? result.risk_event : null,
    total_value: totalValue,
  });
});