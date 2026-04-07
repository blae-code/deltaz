import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAX_ACTIVE_GENERATED_MISSIONS = 2;
const VALID_TYPES = ['recon', 'extraction', 'sabotage', 'escort', 'scavenge', 'elimination'];
const VALID_DIFFICULTIES = ['routine', 'hazardous', 'critical', 'suicide'];
const GENERATED_MARKER = '[GENERATED]';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const userEmail = normalizeEmail(user?.email);

    if (!user || !userEmail) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const preferredType = VALID_TYPES.includes(body.preferred_type) ? body.preferred_type : '';

    // Fetch comprehensive world state
    const [
      factions, territories, jobs, economies, diplomacy,
      events, commodities, scavengeRuns, reputations,
      colony, survivors, worldConditions, baseModules, bases
    ] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 20),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}, '-created_date', 50),
      base44.asServiceRole.entities.Reputation.filter({ player_email: userEmail }),
      base44.asServiceRole.entities.ColonyStatus.filter({}, '-updated_date', 1),
      base44.asServiceRole.entities.Survivor.filter({}, '-created_date', 200),
      base44.asServiceRole.entities.WorldConditions.filter({}, '-updated_date', 1),
      base44.asServiceRole.entities.BaseModule.filter({}),
      base44.asServiceRole.entities.PlayerBase.filter({ owner_email: userEmail }),
    ]);

    const activeFactions = factions.filter(f => f.status === 'active');
    if (activeFactions.length === 0 || territories.length === 0) {
      return Response.json({ error: 'Insufficient world state to generate a mission' }, { status: 409 });
    }

    const activeGenerated = jobs.filter(j =>
      normalizeEmail(j.assigned_to) === userEmail
      && j.status === 'in_progress'
      && isGeneratedMission(j)
    );

    if (activeGenerated.length >= MAX_ACTIVE_GENERATED_MISSIONS) {
      return Response.json(
        { error: `You already have ${MAX_ACTIVE_GENERATED_MISSIONS} active generated missions. Complete or abandon one first.` },
        { status: 409 },
      );
    }

    // --- Build comprehensive world context ---
    const factionById = new Map(factions.map(f => [f.id, f]));
    const territoryById = new Map(territories.map(t => [t.id, t]));

    // Colony status
    const colonyData = colony[0] || null;
    const colonyContext = colonyData ? [
      `Colony "${colonyData.colony_name}": pop=${colonyData.population || 0}, morale=${colonyData.morale ?? 100}/100`,
      `  food=${colonyData.food_reserves ?? 100}, water=${colonyData.water_supply ?? 100}, medical=${colonyData.medical_supplies ?? 100}`,
      `  power=${colonyData.power_level ?? 100}, defense=${colonyData.defense_integrity ?? 100}, threat=${colonyData.threat_level || 'minimal'}`,
      colonyData.last_incident ? `  Last incident: ${colonyData.last_incident}` : '',
    ].filter(Boolean).join('\n') : 'No colony data.';

    // World conditions
    const wc = worldConditions[0] || null;
    const weatherContext = wc ? 
      `Season: ${wc.season}, Weather: ${wc.weather}, Temp: ${wc.temperature_c}°C, Visibility: ${wc.visibility}, Radiation: ${wc.radiation_level}, Wind: ${wc.wind}, Time: ${wc.daylight_phase}${wc.special_conditions?.length ? ', Special: ' + wc.special_conditions.join(', ') : ''}` 
      : 'Unknown conditions.';

    // Active threat waves
    const threatenedTerritories = territories.filter(t => t.active_threat_wave?.status === 'incoming' || t.active_threat_wave?.status === 'active');
    const threatContext = threatenedTerritories.length > 0
      ? threatenedTerritories.map(t => {
          const w = t.active_threat_wave;
          return `${t.name} (${t.sector}): ${w.threat_name || w.type} — strength ${w.strength}, status: ${w.status}`;
        }).join('\n')
      : 'No active threat waves.';

    // Survivor capabilities
    const activeSurvivors = survivors.filter(s => s.status === 'active');
    const skillDistrib = {};
    for (const s of activeSurvivors) {
      skillDistrib[s.skill] = (skillDistrib[s.skill] || 0) + 1;
    }
    const lowMoraleSurvivors = activeSurvivors.filter(s => s.morale === 'desperate' || s.morale === 'anxious');
    const survivorContext = `Active survivors: ${activeSurvivors.length}, Skills: ${Object.entries(skillDistrib).map(([k,v]) => `${k}:${v}`).join(', ')}, Low morale: ${lowMoraleSurvivors.length}`;

    // Base modules context
    const playerModules = baseModules.filter(m => bases.some(b => b.id === m.base_id) && m.status === 'active');
    const moduleTypes = [...new Set(playerModules.map(m => m.module_type))];
    const baseContext = bases.length > 0 
      ? `Player bases: ${bases.map(b => `${b.name} (${b.sector}, DEF ${b.defense_level || 1})`).join(', ')}. Active modules: ${moduleTypes.join(', ') || 'none'}`
      : 'No established bases.';

    // Resource scarcity
    const scarceResources = commodities
      .filter(c => c.availability === 'scarce' || c.availability === 'low')
      .map(c => `${c.resource_type} (${c.availability}, ${c.current_price}c, trend: ${c.price_trend})`);

    const surplusResources = commodities
      .filter(c => c.availability === 'surplus' || c.availability === 'high')
      .map(c => `${c.resource_type} (${c.availability}, ${c.current_price}c)`);

    // Events
    const recentEvents = events
      .slice(0, 8)
      .map(e => `[${e.severity}] ${e.title}: ${(e.content || '').slice(0, 100)}`)
      .join('\n');

    // Territory analysis
    const contestedZones = territories.filter(t => t.status === 'contested' || t.status === 'hostile');
    const hostileRelations = diplomacy.filter(d => d.status === 'war' || d.status === 'hostile');

    const territoryInfo = territories.map(t => {
      const ctrl = factionById.get(t.controlling_faction_id);
      const res = Array.isArray(t.resources) ? t.resources.join(',') : '';
      const threat = t.active_threat_wave ? ` [THREAT: ${t.active_threat_wave.threat_name || t.active_threat_wave.type}]` : '';
      return `${t.name} (${t.sector}): ${t.status}, threat=${t.threat_level}, ctrl=${ctrl?.name || 'none'}, res=[${res}]${threat}`;
    }).join('\n');

    // Player reputation
    const playerReps = reputations.map(r => {
      const f = factionById.get(r.faction_id);
      return `${f?.name || '?'}: ${r.score} (${r.rank})`;
    }).join(', ');

    const playerMissions = jobs.filter(j => normalizeEmail(j.assigned_to) === userEmail);
    const playerCompleted = playerMissions.filter(j => j.status === 'completed').length;
    const playerFailed = playerMissions.filter(j => j.status === 'failed').length;

    const recentScavSectors = [...new Set(scavengeRuns.slice(0, 20).map(r => {
      const t = territoryById.get(r.territory_id);
      return t ? `${t.name} (${t.sector})` : null;
    }).filter(Boolean))];

    // Faction needs
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

    // Active mission type distribution
    const activeJobs = jobs.filter(j => j.status === 'available' || j.status === 'in_progress');
    const typeCounts = {};
    for (const type of activeJobs.map(j => j.type)) {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    // Determine colony urgency tier for reward scaling
    const colonyUrgency = getColonyUrgency(colonyData);

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are GHOST PROTOCOL, the field operations AI for DEAD SIGNAL — a post-apocalyptic survival game.

An operative is requesting a personalized mission. Generate exactly 1 unique, context-driven mission.

=== OPERATIVE PROFILE ===
- Callsign: ${user.callsign || user.full_name || 'Unknown'}
- Completed: ${playerCompleted}, Failed: ${playerFailed}
- Faction standings: ${playerReps || 'No reputation records'}
- Bases: ${baseContext}
${preferredType ? `- Preferred mission type: ${preferredType}` : ''}

=== WORLD CONDITIONS ===
${weatherContext}

=== COLONY STATUS ===
${colonyContext}

=== ACTIVE THREAT WAVES ===
${threatContext}

=== SURVIVOR CAPABILITIES ===
${survivorContext}

=== RESOURCE MARKET ===
SCARCE: ${scarceResources.length > 0 ? scarceResources.join(', ') : 'none critical'}
SURPLUS: ${surplusResources.length > 0 ? surplusResources.join(', ') : 'none'}

=== CONTESTED ZONES ===
${contestedZones.length} (${contestedZones.map(z => z.name).join(', ') || 'none'})

=== ACTIVE CONFLICTS ===
${hostileRelations.map(r => {
  const fA = factionById.get(r.faction_a_id)?.name;
  const fB = factionById.get(r.faction_b_id)?.name;
  return `${fA} vs ${fB}`;
}).join(', ') || 'none'}

=== WORLD EVENTS ===
${recentEvents || 'No active events.'}

=== FACTION ECONOMIES ===
${factionNeeds}

=== RECENT SCAVENGE ACTIVITY ===
${recentScavSectors.join(', ') || 'No recent activity'}

=== TERRITORIES ===
${territoryInfo}

=== CURRENT MISSION BOARD ===
Active type distribution: ${JSON.stringify(typeCounts)}

=== COLONY URGENCY: ${colonyUrgency.toUpperCase()} ===

=== GENERATION RULES ===
1. type must be one of: recon, extraction, sabotage, escort, scavenge, elimination
2. difficulty must be one of: routine, hazardous, critical, suicide
3. MUST reference REAL faction and territory names from the data
4. DYNAMIC OBJECTIVE SELECTION based on world state priority:
   - If ACTIVE THREAT WAVES exist → prefer elimination/defense missions against those specific threats
   - If colony resources are CRITICALLY LOW (below 25) → prefer scavenge/extraction for those resources
   - If colony threat_level is high/critical → prefer recon/elimination in threatened sectors
   - If weather is severe (blizzard, radiation_storm, acid_rain) → missions should acknowledge environmental hazards, increase difficulty
   - If factions are at WAR → prefer sabotage/elimination in enemy territory
   - If scarce resources exist → prefer scavenge/extraction missions targeting them
   - If player has base modules (crafting/workshop) → can reference crafting material runs
   - If low morale survivors exist → lighter missions (escort, recon) to avoid risk
   - Fill gaps in under-represented mission types
5. Write a gritty 2-3 sentence briefing referencing the SPECIFIC world state that triggered this mission
6. Include a concrete objective description (what exactly the operative must do)
7. Reward scaling (base × urgency modifier):
   - routine: 5-15 rep + 50-100 credits
   - hazardous: 15-30 rep + 100-250 credits
   - critical: 30-50 rep + 250-500 credits
   - suicide: 50-100 rep + 500-1000 credits
   - Colony urgency "${colonyUrgency}": ${colonyUrgency === 'critical' ? '1.5x all rewards' : colonyUrgency === 'high' ? '1.25x rewards' : 'standard rewards'}
   - Scale up further if target resource is scarce
8. expires_in_hours: 12-72 (harder = longer)
9. max_slots: 1
10. world_trigger: ONE short phrase identifying what world state triggered this mission (e.g. "food_critical", "horde_incoming_B3", "war_iron_order", "tech_scarcity")`,
      response_json_schema: {
        type: 'object',
        properties: {
          mission: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              briefing: { type: 'string' },
              objective: { type: 'string' },
              type: { type: 'string' },
              difficulty: { type: 'string' },
              reward_reputation: { type: 'number' },
              reward_credits: { type: 'number' },
              reward_description: { type: 'string' },
              expires_in_hours: { type: 'number' },
              max_slots: { type: 'number' },
              faction_name: { type: 'string' },
              territory_name: { type: 'string' },
              world_context: { type: 'string' },
              world_trigger: { type: 'string' },
            },
          },
        },
      },
    });

    const gen = sanitizeMission(response?.mission);
    const targetFaction = matchFaction(activeFactions, gen.faction_name)
      || matchFaction(factions, gen.faction_name)
      || activeFactions[0];
    const targetTerritory = matchTerritory(territories, gen.territory_name)
      || territories.find(t => t.controlling_faction_id === targetFaction?.id)
      || contestedZones[0]
      || territories[0];

    // Apply colony urgency reward multiplier
    let repReward = gen.reward_reputation;
    let creditReward = gen.reward_credits;
    if (colonyUrgency === 'critical') {
      repReward = Math.round(repReward * 1.5);
      creditReward = Math.round(creditReward * 1.5);
    } else if (colonyUrgency === 'high') {
      repReward = Math.round(repReward * 1.25);
      creditReward = Math.round(creditReward * 1.25);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (gen.expires_in_hours * 3600000)).toISOString();
    const descParts = [
      gen.briefing,
      `**OBJECTIVE:** ${gen.objective}`,
    ];
    if (gen.world_context) descParts.push(`_${gen.world_context}_`);
    if (gen.world_trigger) descParts.push(`[TRIGGER: ${gen.world_trigger}]`);
    descParts.push(GENERATED_MARKER);

    const job = await base44.asServiceRole.entities.Job.create({
      title: gen.title,
      description: descParts.join('\n\n'),
      type: gen.type,
      difficulty: gen.difficulty,
      status: 'in_progress',
      assigned_to: userEmail,
      accepted_at: now.toISOString(),
      faction_id: targetFaction?.id || '',
      territory_id: targetTerritory?.id || '',
      reward_reputation: repReward,
      reward_credits: creditReward,
      reward_description: gen.reward_description,
      expires_at: expiresAt,
      max_slots: 1,
    });

    await base44.asServiceRole.entities.Notification.create({
      player_email: userEmail,
      title: `Mission Generated: ${job.title}`,
      message: `GHOST PROTOCOL assigned a ${job.difficulty} ${job.type} mission. Trigger: ${gen.world_trigger || 'field analysis'}`,
      type: 'mission_assigned',
      priority: gen.difficulty === 'suicide' || gen.difficulty === 'critical' ? 'high' : 'normal',
      is_read: false,
      reference_id: job.id,
    });

    return Response.json({
      status: 'ok',
      colony_urgency: colonyUrgency,
      mission: {
        id: job.id,
        title: job.title,
        briefing: gen.briefing,
        objective: gen.objective,
        type: job.type,
        difficulty: job.difficulty,
        reward_reputation: repReward,
        reward_credits: creditReward,
        reward_description: gen.reward_description,
        faction_name: targetFaction?.name || '',
        territory_name: targetTerritory?.name || '',
        world_context: gen.world_context,
        world_trigger: gen.world_trigger,
        expires_at: job.expires_at,
      },
    });
  } catch (error) {
    console.error('Mission generator error:', error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});

function getColonyUrgency(colony) {
  if (!colony) return 'normal';
  const metrics = [
    colony.food_reserves ?? 100,
    colony.water_supply ?? 100,
    colony.medical_supplies ?? 100,
    colony.defense_integrity ?? 100,
  ];
  const minMetric = Math.min(...metrics);
  const threat = colony.threat_level || 'minimal';
  if (minMetric < 15 || threat === 'critical') return 'critical';
  if (minMetric < 30 || threat === 'high') return 'high';
  if (minMetric < 50 || threat === 'moderate') return 'moderate';
  return 'normal';
}

function sanitizeMission(mission) {
  return {
    title: normalizeString(mission?.title, 120) || 'Field Opportunity',
    briefing: normalizeString(mission?.briefing, 600) || 'Command has identified a tactical opening. Move quickly.',
    objective: normalizeString(mission?.objective, 320) || 'Secure the objective and return alive.',
    type: VALID_TYPES.includes(mission?.type) ? mission.type : 'recon',
    difficulty: VALID_DIFFICULTIES.includes(mission?.difficulty) ? mission.difficulty : 'routine',
    reward_reputation: clampNumber(mission?.reward_reputation, 5, 150, 10),
    reward_credits: clampNumber(mission?.reward_credits, 50, 1500, 100),
    reward_description: normalizeString(mission?.reward_description, 180),
    expires_in_hours: clampNumber(mission?.expires_in_hours, 12, 72, 24),
    faction_name: normalizeString(mission?.faction_name, 120),
    territory_name: normalizeString(mission?.territory_name, 120),
    world_context: normalizeString(mission?.world_context, 220),
    world_trigger: normalizeString(mission?.world_trigger, 80),
  };
}

function matchFaction(factions, name) {
  const n = normalizeName(name);
  if (!n) return null;
  return factions.find(f => normalizeName(f.name) === n) || null;
}

function matchTerritory(territories, name) {
  const n = normalizeName(name);
  if (!n) return null;
  return territories.find(t => normalizeName(t.name) === n) || null;
}

function isGeneratedMission(job) {
  return typeof job?.description === 'string' && job.description.includes(GENERATED_MARKER);
}

function normalizeEmail(value) {
  return normalizeString(value, 320).toLowerCase();
}

function normalizeName(value) {
  return normalizeString(value, 120).toLowerCase();
}

function normalizeString(value, maxLength = 255) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unexpected error';
}