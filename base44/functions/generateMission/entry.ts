import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

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

    const [factions, territories, jobs, economies, diplomacy, events, commodities, scavengeRuns, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 20),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}, '-created_date', 50),
      base44.asServiceRole.entities.Reputation.filter({ player_email: userEmail }),
    ]);

    const activeFactions = factions.filter((faction) => faction.status === 'active');
    if (activeFactions.length === 0 || territories.length === 0) {
      return Response.json({ error: 'Insufficient world state to generate a mission' }, { status: 409 });
    }

    const activeGenerated = jobs.filter((job) =>
      normalizeEmail(job.assigned_to) === userEmail
      && job.status === 'in_progress'
      && isGeneratedMission(job)
    );

    if (activeGenerated.length >= MAX_ACTIVE_GENERATED_MISSIONS) {
      return Response.json(
        { error: `You already have ${MAX_ACTIVE_GENERATED_MISSIONS} active generated missions. Complete or abandon one first.` },
        { status: 409 },
      );
    }

    const scarceResources = commodities
      .filter((commodity) => commodity.availability === 'scarce' || commodity.availability === 'low')
      .map((commodity) => `${commodity.resource_type} (${commodity.availability}, price: ${commodity.current_price}c, trend: ${commodity.price_trend})`);

    const surplusResources = commodities
      .filter((commodity) => commodity.availability === 'surplus' || commodity.availability === 'high')
      .map((commodity) => `${commodity.resource_type} (${commodity.availability}, price: ${commodity.current_price}c)`);

    const recentEvents = events
      .slice(0, 8)
      .map((event) => `[${event.severity}] ${event.title}: ${(event.content || '').slice(0, 100)}`)
      .join('\n');

    const contestedZones = territories.filter((territory) => territory.status === 'contested' || territory.status === 'hostile');
    const hostileRelations = diplomacy.filter((relationship) => relationship.status === 'war' || relationship.status === 'hostile');
    const factionById = new Map(factions.map((faction) => [faction.id, faction]));

    const territoryInfo = territories.map((territory) => {
      const controller = factionById.get(territory.controlling_faction_id);
      const resources = Array.isArray(territory.resources) ? territory.resources.join(',') : '';
      return `${territory.name} (${territory.sector}): ${territory.status}, threat=${territory.threat_level}, controller=${controller?.name || 'none'}, resources=[${resources}]`;
    }).join('\n');

    const playerReps = reputations.map((reputation) => {
      const faction = factionById.get(reputation.faction_id);
      return `${faction?.name || '?'}: ${reputation.score} (${reputation.rank})`;
    }).join(', ');

    const playerMissions = jobs.filter((job) => normalizeEmail(job.assigned_to) === userEmail);
    const playerCompleted = playerMissions.filter((job) => job.status === 'completed').length;
    const playerFailed = playerMissions.filter((job) => job.status === 'failed').length;

    const territoryById = new Map(territories.map((territory) => [territory.id, territory]));
    const recentScavSectors = [...new Set(scavengeRuns.slice(0, 20).map((run) => {
      const territory = territoryById.get(run.territory_id);
      return territory ? `${territory.name} (${territory.sector})` : null;
    }).filter(Boolean))];

    const factionNeeds = activeFactions.map((faction) => {
      const economy = economies.find((entry) => entry.faction_id === faction.id);
      if (!economy) return `${faction.name}: unknown`;
      const production = economy.resource_production || {};
      const needs = [];
      if ((production.fuel || 0) < 5) needs.push('fuel');
      if ((production.food || 0) < 5) needs.push('food');
      if ((production.munitions || 0) < 3) needs.push('munitions');
      if ((production.tech || 0) < 3) needs.push('tech');
      if ((production.metals || 0) < 5) needs.push('metals');
      if (economy.trade_embargo) needs.push('EMBARGOED');
      if ((economy.wealth || 0) < 500) needs.push('broke');
      return `${faction.name}: needs=[${needs.join(',')}], wealth=${economy.wealth}`;
    }).join('\n');

    const activeJobs = jobs.filter((job) => job.status === 'available' || job.status === 'in_progress');
    const typeCounts = {};
    for (const type of activeJobs.map((job) => job.type)) {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are GHOST PROTOCOL, the field operations AI for DEAD SIGNAL — a post-apocalyptic survival game.

An operative is requesting a personalized mission. Generate exactly 1 unique, context-driven mission.

=== OPERATIVE PROFILE ===
- Callsign: ${user.callsign || user.full_name || 'Unknown'}
- Completed missions: ${playerCompleted}, Failed: ${playerFailed}
- Faction standings: ${playerReps || 'No reputation records'}
${preferredType ? `- Preferred mission type: ${preferredType}` : ''}

=== WORLD STATE ===
SCARCE RESOURCES: ${scarceResources.length > 0 ? scarceResources.join(', ') : 'none critical'}
SURPLUS RESOURCES: ${surplusResources.length > 0 ? surplusResources.join(', ') : 'none'}
CONTESTED ZONES: ${contestedZones.length} (${contestedZones.map((zone) => zone.name).join(', ') || 'none'})
ACTIVE CONFLICTS: ${hostileRelations.map((relationship) => {
  const factionA = factionById.get(relationship.faction_a_id)?.name;
  const factionB = factionById.get(relationship.faction_b_id)?.name;
  return `${factionA} vs ${factionB}`;
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
10. max_slots must be 1`,
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
            },
          },
        },
      },
    });

    const generatedMission = sanitizeMission(response?.mission);
    const targetFaction = matchFaction(activeFactions, generatedMission.faction_name)
      || matchFaction(factions, generatedMission.faction_name)
      || activeFactions[0];
    const targetTerritory = matchTerritory(territories, generatedMission.territory_name)
      || territories.find((territory) => territory.controlling_faction_id === targetFaction?.id)
      || contestedZones[0]
      || territories[0];

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (generatedMission.expires_in_hours * 3600000)).toISOString();
    const descriptionParts = [
      generatedMission.briefing,
      `**OBJECTIVE:** ${generatedMission.objective}`,
    ];
    if (generatedMission.world_context) {
      descriptionParts.push(`_${generatedMission.world_context}_`);
    }
    descriptionParts.push(GENERATED_MARKER);

    const job = await base44.asServiceRole.entities.Job.create({
      title: generatedMission.title,
      description: descriptionParts.join('\n\n'),
      type: generatedMission.type,
      difficulty: generatedMission.difficulty,
      status: 'in_progress',
      assigned_to: userEmail,
      accepted_at: now.toISOString(),
      faction_id: targetFaction?.id || '',
      territory_id: targetTerritory?.id || '',
      reward_reputation: generatedMission.reward_reputation,
      reward_credits: generatedMission.reward_credits,
      reward_description: generatedMission.reward_description,
      expires_at: expiresAt,
      max_slots: 1,
    });

    await base44.asServiceRole.entities.Notification.create({
      player_email: userEmail,
      title: `Generated Mission Ready: ${job.title}`,
      message: `GHOST PROTOCOL assigned a ${job.difficulty} ${job.type} mission to your queue.`,
      type: 'mission_assigned',
      priority: generatedMission.difficulty === 'suicide' || generatedMission.difficulty === 'critical' ? 'high' : 'normal',
      is_read: false,
      reference_id: job.id,
    });

    return Response.json({
      status: 'ok',
      mission: {
        id: job.id,
        title: job.title,
        briefing: generatedMission.briefing,
        objective: generatedMission.objective,
        type: job.type,
        difficulty: job.difficulty,
        reward_reputation: job.reward_reputation,
        reward_credits: job.reward_credits,
        reward_description: job.reward_description,
        faction_name: targetFaction?.name || '',
        territory_name: targetTerritory?.name || '',
        world_context: generatedMission.world_context,
        expires_at: job.expires_at,
      },
    });
  } catch (error) {
    console.error('Mission generator error:', error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});

function sanitizeMission(mission) {
  const difficulty = VALID_DIFFICULTIES.includes(mission?.difficulty) ? mission.difficulty : 'routine';
  return {
    title: normalizeString(mission?.title, 120) || 'Field Opportunity',
    briefing: normalizeString(mission?.briefing, 600) || 'Command has identified a tactical opening. Move quickly before the window closes.',
    objective: normalizeString(mission?.objective, 320) || 'Secure the objective and return alive.',
    type: VALID_TYPES.includes(mission?.type) ? mission.type : 'recon',
    difficulty,
    reward_reputation: clampNumber(mission?.reward_reputation, 5, 100, 10),
    reward_credits: clampNumber(mission?.reward_credits, 50, 1000, 100),
    reward_description: normalizeString(mission?.reward_description, 180),
    expires_in_hours: clampNumber(mission?.expires_in_hours, 12, 72, 24),
    faction_name: normalizeString(mission?.faction_name, 120),
    territory_name: normalizeString(mission?.territory_name, 120),
    world_context: normalizeString(mission?.world_context, 220),
  };
}

function matchFaction(factions, name) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return null;
  return factions.find((faction) => normalizeName(faction.name) === normalizedName) || null;
}

function matchTerritory(territories, name) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return null;
  return territories.find((territory) => normalizeName(territory.name) === normalizedName) || null;
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
  if (typeof value !== 'string') {
    return '';
  }

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
