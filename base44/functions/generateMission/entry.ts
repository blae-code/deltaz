import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { preferred_type } = await req.json();

    // Gather world state
    const [factions, territories, jobs, economies, diplomacy, events, commodities, scavengeRuns, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({}),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}, '-created_date', 50),
      base44.asServiceRole.entities.Reputation.filter({ player_email: user.email }),
    ]);

    // Throttle: max 2 generated missions in-progress per player
    const playerActive = jobs.filter(j => j.assigned_to === user.email && (j.status === 'in_progress' || j.status === 'available') && j.description?.includes('[GENERATED]'));
    if (playerActive.length >= 2) {
      return Response.json({ error: 'You already have 2 active generated missions. Complete or abandon one first.' }, { status: 400 });
    }

    // Build world context
    const activeFactions = factions.filter(f => f.status === 'active');

    const scarceResources = commodities
      .filter(c => c.availability === 'scarce' || c.availability === 'low')
      .map(c => `${c.resource_type} (${c.availability}, price: ${c.current_price}c, trend: ${c.price_trend})`);

    const surplusResources = commodities
      .filter(c => c.availability === 'surplus' || c.availability === 'high')
      .map(c => `${c.resource_type} (${c.availability}, price: ${c.current_price}c)`);

    const recentEvents = events
      .filter(e => e.is_active)
      .slice(0, 8)
      .map(e => `[${e.severity}] ${e.title}: ${e.content?.substring(0, 100) || ''}`)
      .join('\n');

    const contestedZones = territories.filter(t => t.status === 'contested' || t.status === 'hostile');
    const hostileRelations = diplomacy.filter(d => d.status === 'war' || d.status === 'hostile');

    const territoryInfo = territories.map(t => {
      const ctrl = factions.find(f => f.id === t.controlling_faction_id);
      const res = Array.isArray(t.resources) ? t.resources.join(',') : '';
      return `${t.name} (${t.sector}): ${t.status}, threat=${t.threat_level}, controller=${ctrl?.name || 'none'}, resources=[${res}]`;
    }).join('\n');

    // Player context
    const playerReps = reputations.map(r => {
      const f = factions.find(fc => fc.id === r.faction_id);
      return `${f?.name || '?'}: ${r.score} (${r.rank})`;
    }).join(', ');

    const playerMissions = jobs.filter(j => j.assigned_to === user.email);
    const playerCompleted = playerMissions.filter(j => j.status === 'completed').length;
    const playerFailed = playerMissions.filter(j => j.status === 'failed').length;

    // Recent scavenge activity patterns
    const recentScavSectors = [...new Set(scavengeRuns.slice(0, 20).map(sr => {
      const t = territories.find(tr => tr.id === sr.territory_id);
      return t ? `${t.name} (${t.sector})` : null;
    }).filter(Boolean))];

    // Faction economy needs
    const factionNeeds = activeFactions.map(f => {
      const eco = economies.find(e => e.faction_id === f.id);
      if (!eco) return `${f.name}: unknown`;
      const prod = eco.resource_production || {};
      const needs = [];
      if ((prod.fuel || 0) < 5) needs.push('fuel');
      if ((prod.food || 0) < 5) needs.push('food');
      if ((prod.munitions || 0) < 3) needs.push('munitions');
      if ((prod.tech || 0) < 3) needs.push('tech');
      if ((prod.metals || 0) < 5) needs.push('metals');
      if (eco.trade_embargo) needs.push('EMBARGOED');
      if ((eco.wealth || 0) < 500) needs.push('broke');
      return `${f.name}: needs=[${needs.join(',')}], wealth=${eco.wealth}`;
    }).join('\n');

    // Existing mission types for gap analysis
    const activeJobs = jobs.filter(j => j.status === 'available');
    const activeMissionTypes = activeJobs.map(j => j.type);
    const typeCounts = {};
    for (const t of activeMissionTypes) {
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    const prompt = `You are GHOST PROTOCOL, the field operations AI for DEAD SIGNAL — a post-apocalyptic survival game.

An operative is requesting a mission. Generate exactly 1 unique, context-driven mission.

=== OPERATIVE PROFILE ===
- Callsign: ${user.callsign || user.full_name || 'Unknown'}
- Completed missions: ${playerCompleted}, Failed: ${playerFailed}
- Faction standings: ${playerReps || 'No reputation records'}
${preferred_type ? `- Preferred mission type: ${preferred_type}` : ''}

=== WORLD STATE ===
SCARCE RESOURCES: ${scarceResources.length > 0 ? scarceResources.join(', ') : 'none critical'}
SURPLUS RESOURCES: ${surplusResources.length > 0 ? surplusResources.join(', ') : 'none'}
CONTESTED ZONES: ${contestedZones.length} (${contestedZones.map(z => z.name).join(', ') || 'none'})
ACTIVE CONFLICTS: ${hostileRelations.map(d => {
  const a = factions.find(f => f.id === d.faction_a_id)?.name;
  const b = factions.find(f => f.id === d.faction_b_id)?.name;
  return `${a} vs ${b}`;
}).join(', ') || 'none'}

=== ACTIVE WORLD EVENTS ===
${recentEvents || 'No active events.'}

=== FACTION ECONOMIES ===
${factionNeeds}

=== RECENT SCAVENGE HOTSPOTS ===
${recentScavSectors.join(', ') || 'No recent activity'}

=== TERRITORIES ===
${territoryInfo}

=== CURRENT MISSION BOARD ===
Active type distribution: ${JSON.stringify(typeCounts)}
(Prefer under-represented types to fill gaps)

=== GENERATION RULES ===
1. type must be one of: recon, extraction, sabotage, escort, scavenge, elimination
2. difficulty must be one of: routine, hazardous, critical, suicide
3. MUST reference REAL faction and territory names from the data above
4. Mission MUST directly connect to current world state:
   - Scarce resources → missions to secure supply
   - Active conflicts → missions tied to the war effort
   - World events → missions responding to or investigating events
   - Scavenge hotspots → missions near depleted areas or unexplored zones
5. Write a gritty 2-3 sentence briefing that feels alive and urgent
6. Include a specific objective description (what exactly the operative must do)
7. Reward: routine=5-15 rep + 50-100 credits, hazardous=15-30 rep + 100-250 credits, critical=30-50 rep + 250-500 credits, suicide=50-100 rep + 500-1000 credits
8. Scale rewards up if the target resource is scarce
9. expires_in_hours: 12-72 (harder = longer window)
10. max_slots: 1-3 (harder = fewer slots)`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          mission: {
            type: "object",
            properties: {
              title: { type: "string" },
              briefing: { type: "string" },
              objective: { type: "string" },
              type: { type: "string" },
              difficulty: { type: "string" },
              reward_reputation: { type: "number" },
              reward_credits: { type: "number" },
              reward_description: { type: "string" },
              expires_in_hours: { type: "number" },
              max_slots: { type: "number" },
              faction_name: { type: "string" },
              territory_name: { type: "string" },
              world_context: { type: "string" }
            }
          }
        }
      }
    });

    const m = result.mission;
    const validTypes = ['recon', 'extraction', 'sabotage', 'escort', 'scavenge', 'elimination'];
    const validDifficulty = ['routine', 'hazardous', 'critical', 'suicide'];

    const faction = factions.find(f => f.name === m.faction_name);
    const territory = territories.find(t => t.name === m.territory_name);
    const expiresAt = new Date(Date.now() + (m.expires_in_hours || 24) * 3600000).toISOString();

    const fullDescription = `${m.briefing}\n\n**OBJECTIVE:** ${m.objective}\n\n_${m.world_context || ''}_\n\n[GENERATED]`;

    const job = await base44.asServiceRole.entities.Job.create({
      title: m.title,
      description: fullDescription,
      type: validTypes.includes(m.type) ? m.type : 'recon',
      difficulty: validDifficulty.includes(m.difficulty) ? m.difficulty : 'routine',
      status: 'available',
      faction_id: faction?.id || '',
      territory_id: territory?.id || '',
      reward_reputation: m.reward_reputation || 10,
      reward_credits: m.reward_credits || 50,
      reward_description: m.reward_description || '',
      expires_at: expiresAt,
      max_slots: Math.min(3, Math.max(1, m.max_slots || 1)),
    });

    return Response.json({
      status: 'ok',
      mission: {
        id: job.id,
        title: job.title,
        briefing: m.briefing,
        objective: m.objective,
        type: job.type,
        difficulty: job.difficulty,
        reward_reputation: job.reward_reputation,
        reward_credits: job.reward_credits,
        reward_description: job.reward_description,
        faction_name: m.faction_name,
        territory_name: m.territory_name,
        world_context: m.world_context,
        expires_at: job.expires_at,
      }
    });
  } catch (err) {
    console.error('Mission generator error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});