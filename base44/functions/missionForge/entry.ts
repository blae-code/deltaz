import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const [factions, territories, jobs, economies] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Job.filter({}),
    base44.asServiceRole.entities.FactionEconomy.filter({}),
  ]);

  const activeJobs = jobs.filter(j => j.status === 'available' || j.status === 'in_progress');
  const contestedZones = territories.filter(t => t.status === 'contested' || t.status === 'hostile');
  const activeFactions = factions.filter(f => f.status === 'active');

  // Build economic context per faction
  const economicSummary = activeFactions.map(f => {
    const eco = economies.find(e => e.faction_id === f.id);
    if (!eco) return `${f.name} [${f.tag}]: NO ECONOMIC DATA`;
    const prod = eco.resource_production || {};
    const totalProd = Object.values(prod).reduce((s, v) => s + (v || 0), 0);
    const adjustedProd = Math.round(totalProd * (eco.supply_chain_modifier || 1));
    const netIncome = (eco.last_cycle_income || 0) - (eco.last_cycle_tax || 0);
    return `${f.name} [${f.tag}]: wealth=${eco.wealth}, production=${adjustedProd}/cycle, net_income=${netIncome}, tax_rate=${Math.round((eco.tax_rate || 0) * 100)}%, embargo=${eco.trade_embargo ? 'YES' : 'no'}, resources=[fuel:${prod.fuel || 0}, metals:${prod.metals || 0}, tech:${prod.tech || 0}, food:${prod.food || 0}, munitions:${prod.munitions || 0}]`;
  }).join('\n');

  // Territory threat analysis
  const territoryDetail = territories.map(t => {
    const ctrl = factions.find(f => f.id === t.controlling_faction_id);
    const resources = (t.resources || []).join(', ') || 'none';
    return `${t.name} (${t.sector}): controller=${ctrl?.name || 'UNCLAIMED'}, status=${t.status}, threat=${t.threat_level}, resources=[${resources}]`;
  }).join('\n');

  // Identify faction needs based on economy
  const factionNeeds = activeFactions.map(f => {
    const eco = economies.find(e => e.faction_id === f.id);
    const needs = [];
    if (!eco) return `${f.name}: unknown needs`;
    const prod = eco.resource_production || {};
    if ((prod.fuel || 0) < 5) needs.push('fuel shortage');
    if ((prod.food || 0) < 5) needs.push('food crisis');
    if ((prod.munitions || 0) < 3) needs.push('low munitions');
    if ((prod.tech || 0) < 3) needs.push('tech deficit');
    if ((prod.metals || 0) < 5) needs.push('metal scarcity');
    if (eco.trade_embargo) needs.push('trade embargo — desperate');
    if ((eco.wealth || 0) < 500) needs.push('financially struggling');
    if ((eco.supply_chain_modifier || 1) < 0.7) needs.push('supply chain disrupted');
    const controlledTerritories = territories.filter(t => t.controlling_faction_id === f.id).length;
    if (controlledTerritories < 2) needs.push('territory expansion needed');
    return `${f.name}: ${needs.length > 0 ? needs.join(', ') : 'stable'}`;
  }).join('\n');

  // Determine global economic state for reward scaling
  const totalWealth = economies.reduce((s, e) => s + (e.wealth || 0), 0);
  const avgWealth = economies.length > 0 ? Math.round(totalWealth / economies.length) : 1000;
  const wealthTier = avgWealth < 500 ? 'scarce' : avgWealth < 1500 ? 'moderate' : 'abundant';

  const prompt = `You are MISSION FORGE, the tactical operations AI for DEAD SIGNAL — a post-apocalyptic survival game.

=== FACTION ECONOMICS ===
${economicSummary}

=== FACTION NEEDS ===
${factionNeeds}

=== TERRITORY INTEL ===
${territoryDetail}

=== OPERATIONAL STATUS ===
- Active missions: ${activeJobs.length} (types: ${[...new Set(activeJobs.map(j => j.type))].join(', ') || 'none'})
- Completed: ${jobs.filter(j => j.status === 'completed').length}, Failed: ${jobs.filter(j => j.status === 'failed').length}
- Contested/hostile zones: ${contestedZones.length}
- Global economy: ${wealthTier} (avg wealth: ${avgWealth})

=== GENERATION RULES ===
Generate exactly 3 new missions following these rules:

1. MISSION TYPES must be one of: recon, extraction, sabotage, escort, scavenge, elimination
2. DIFFICULTY must be one of: routine, hazardous, critical, suicide
3. Reference REAL faction names and territory names from the data
4. Missions MUST address faction needs:
   - Resource shortages → scavenge/extraction missions in resource-rich territories
   - Trade embargoes → sabotage/elimination missions against rival supply lines
   - Territory needs → recon/escort missions in unclaimed or contested zones
   - Financial struggles → scavenge high-value targets
   - Low munitions → extraction from hostile zones
5. Fill gaps in mission type coverage (avoid types already heavily represented)
6. Vary difficulty — at least one should be hazardous or above
7. REWARD SCALING based on economy (current: ${wealthTier}):
   - Scarce economy: reputation 1.5x normal, resource rewards critical
   - Moderate economy: standard rewards
   - Abundant economy: reputation standard, bonus luxury rewards
   Base rewards: routine=5-10, hazardous=15-25, critical=30-50, suicide=60-100
8. Reward descriptions should mention specific resources matching the issuing faction's needs
9. Write gritty, immersive 2-3 sentence briefings
10. Set expiry between 12-72 hours (harder = longer window)
11. At least one mission in a contested/hostile territory if any exist`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        missions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              type: { type: "string" },
              difficulty: { type: "string" },
              reward_reputation: { type: "number" },
              reward_description: { type: "string" },
              expires_in_hours: { type: "number" },
              faction_name: { type: "string" },
              territory_name: { type: "string" }
            }
          }
        }
      }
    }
  });

  const validTypes = ['recon', 'extraction', 'sabotage', 'escort', 'scavenge', 'elimination'];
  const validDifficulty = ['routine', 'hazardous', 'critical', 'suicide'];

  const created = [];
  for (const m of result.missions) {
    const faction = factions.find(f => f.name === m.faction_name);
    const territory = territories.find(t => t.name === m.territory_name);
    const expiresAt = new Date(Date.now() + (m.expires_in_hours || 24) * 3600000).toISOString();

    const jobType = validTypes.includes(m.type) ? m.type : 'recon';
    const difficulty = validDifficulty.includes(m.difficulty) ? m.difficulty : 'routine';

    // Apply economic reward multiplier
    let repReward = m.reward_reputation || 10;
    if (wealthTier === 'scarce') repReward = Math.round(repReward * 1.5);

    const record = await base44.asServiceRole.entities.Job.create({
      title: m.title,
      description: m.description,
      type: jobType,
      difficulty,
      status: 'available',
      faction_id: faction?.id || '',
      territory_id: territory?.id || '',
      reward_reputation: repReward,
      reward_description: m.reward_description || '',
      expires_at: expiresAt,
    });
    created.push(record);
  }

  // Broadcast event about new missions
  await base44.asServiceRole.entities.Event.create({
    title: `MISSION FORGE: ${created.length} new operations posted`,
    content: created.map(c => `• ${c.title} (${c.difficulty} ${c.type})`).join('\n'),
    type: 'system_alert',
    severity: 'info',
    is_active: true,
  });

  return Response.json({
    status: 'ok',
    economy_tier: wealthTier,
    avg_faction_wealth: avgWealth,
    generated: created.length,
    missions: created.map(c => ({ title: c.title, type: c.type, difficulty: c.difficulty, reward: c.reward_reputation }))
  });
});