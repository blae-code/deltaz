import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin manual trigger and scheduled automation
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (_) {
      // Scheduled automation — no user context
    }

    const body = await req.json().catch(() => ({}));
    const missionCount = Math.min(Math.max(body.count || 3, 1), 6);

    // Fetch comprehensive world state
    const [
      factions, territories, jobs, economies, diplomacy,
      charProfiles, users, colony, worldConditions, survivors, baseModules
    ] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.CharacterProfile.filter({}, '-created_date', 30),
      base44.asServiceRole.entities.User.filter({}),
      base44.asServiceRole.entities.ColonyStatus.filter({}, '-updated_date', 1),
      base44.asServiceRole.entities.WorldConditions.filter({}, '-updated_date', 1),
      base44.asServiceRole.entities.Survivor.filter({}, '-created_date', 200),
      base44.asServiceRole.entities.BaseModule.filter({}),
    ]);

    const activeJobs = jobs.filter(j => j.status === 'available' || j.status === 'in_progress');
    const contestedZones = territories.filter(t => t.status === 'contested' || t.status === 'hostile');
    const activeFactions = factions.filter(f => f.status === 'active');

    // Colony status
    const colonyData = colony[0] || null;
    const colonyContext = colonyData ? [
      `Colony "${colonyData.colony_name}": pop=${colonyData.population || 0}, morale=${colonyData.morale ?? 100}/100`,
      `  food=${colonyData.food_reserves ?? 100}, water=${colonyData.water_supply ?? 100}, medical=${colonyData.medical_supplies ?? 100}`,
      `  power=${colonyData.power_level ?? 100}, defense=${colonyData.defense_integrity ?? 100}, threat=${colonyData.threat_level || 'minimal'}`,
    ].join('\n') : 'No colony data.';

    // World conditions
    const wc = worldConditions[0] || null;
    const weatherContext = wc
      ? `Season: ${wc.season}, Weather: ${wc.weather}, Temp: ${wc.temperature_c}°C, Visibility: ${wc.visibility}, Radiation: ${wc.radiation_level}, Time: ${wc.daylight_phase}${wc.special_conditions?.length ? ', Special: ' + wc.special_conditions.join(', ') : ''}`
      : 'Unknown.';

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
    for (const s of activeSurvivors) skillDistrib[s.skill] = (skillDistrib[s.skill] || 0) + 1;
    const survivorContext = `Active: ${activeSurvivors.length}, Skills: ${Object.entries(skillDistrib).map(([k,v]) => `${k}:${v}`).join(', ')}`;

    // Module summary
    const activeModules = baseModules.filter(m => m.status === 'active');
    const moduleTypeCounts = {};
    for (const m of activeModules) moduleTypeCounts[m.module_type] = (moduleTypeCounts[m.module_type] || 0) + 1;
    const moduleContext = activeModules.length > 0
      ? `Colony modules: ${Object.entries(moduleTypeCounts).map(([k,v]) => `${k}:${v}`).join(', ')}`
      : 'No modules built.';

    // Economic context
    const economicSummary = activeFactions.map(f => {
      const eco = economies.find(e => e.faction_id === f.id);
      if (!eco) return `${f.name}: NO DATA`;
      const prod = eco.resource_production || {};
      return `${f.name}: wealth=${eco.wealth}, embargo=${eco.trade_embargo ? 'YES' : 'no'}, resources=[fuel:${prod.fuel || 0},metals:${prod.metals || 0},tech:${prod.tech || 0},food:${prod.food || 0},munitions:${prod.munitions || 0}]`;
    }).join('\n');

    // Territory detail
    const territoryDetail = territories.map(t => {
      const ctrl = factions.find(f => f.id === t.controlling_faction_id);
      const rawRes = Array.isArray(t.resources) ? t.resources : [];
      const threat = t.active_threat_wave ? ` [THREAT: ${t.active_threat_wave.threat_name || t.active_threat_wave.type}, str:${t.active_threat_wave.strength}]` : '';
      return `${t.name} (${t.sector}): ctrl=${ctrl?.name || 'UNCLAIMED'}, status=${t.status}, threat=${t.threat_level}, res=[${rawRes.join(',')}]${threat}`;
    }).join('\n');

    // Faction needs
    const factionNeeds = activeFactions.map(f => {
      const eco = economies.find(e => e.faction_id === f.id);
      const needs = [];
      if (!eco) return `${f.name}: unknown`;
      const prod = eco.resource_production || {};
      if ((prod.fuel || 0) < 5) needs.push('fuel shortage');
      if ((prod.food || 0) < 5) needs.push('food crisis');
      if ((prod.munitions || 0) < 3) needs.push('low munitions');
      if ((prod.tech || 0) < 3) needs.push('tech deficit');
      if ((prod.metals || 0) < 5) needs.push('metal scarcity');
      if (eco.trade_embargo) needs.push('EMBARGOED');
      if ((eco.wealth || 0) < 500) needs.push('financially struggling');
      return `${f.name}: ${needs.length > 0 ? needs.join(', ') : 'stable'}`;
    }).join('\n');

    // Diplomacy
    const diplomacySummary = diplomacy.map(d => {
      const fA = factions.find(f => f.id === d.faction_a_id);
      const fB = factions.find(f => f.id === d.faction_b_id);
      if (!fA || !fB) return null;
      return `${fA.name} ↔ ${fB.name}: ${d.status}`;
    }).filter(Boolean).join('\n') || 'No formal relationships.';

    // Operative roster
    const operativeRoster = charProfiles
      .filter(cp => cp.backstory || cp.origin)
      .slice(0, 15)
      .map(cp => {
        const u = users.find(u => u.email === cp.player_email);
        return `- ${u?.callsign || cp.character_name || 'Unknown'}: skill=${cp.primary_skill || 'general'}, combat=${cp.combat_rating || 2}, loyalty="${cp.faction_loyalty || 'unaligned'}"`;
      }).join('\n');

    // Urgency
    const colonyUrgency = getColonyUrgency(colonyData);

    // Type coverage gaps
    const typeCounts = {};
    for (const j of activeJobs) typeCounts[j.type] = (typeCounts[j.type] || 0) + 1;

    const prompt = `You are MISSION FORGE, the tactical operations AI for DEAD SIGNAL — a post-apocalyptic survival game.

=== WORLD CONDITIONS ===
${weatherContext}

=== COLONY STATUS (URGENCY: ${colonyUrgency.toUpperCase()}) ===
${colonyContext}

=== ACTIVE THREAT WAVES ===
${threatContext}

=== SURVIVOR CAPABILITIES ===
${survivorContext}

=== BASE MODULES ===
${moduleContext}

=== FACTION ECONOMICS ===
${economicSummary}

=== DIPLOMATIC RELATIONS ===
${diplomacySummary}

=== FACTION NEEDS ===
${factionNeeds}

=== TERRITORY INTEL ===
${territoryDetail}

=== ACTIVE OPERATIVES ===
${operativeRoster || 'No operatives registered.'}

=== OPERATIONAL STATUS ===
- Active missions: ${activeJobs.length} (types: ${JSON.stringify(typeCounts)})
- Completed: ${jobs.filter(j => j.status === 'completed').length}, Failed: ${jobs.filter(j => j.status === 'failed').length}
- Contested/hostile zones: ${contestedZones.length}
- Threat waves: ${threatenedTerritories.length} active

=== GENERATION RULES ===
Generate exactly ${missionCount} new missions:

1. type: recon | extraction | sabotage | escort | scavenge | elimination
2. difficulty: routine | hazardous | critical | suicide
3. Reference REAL faction and territory names from the data
4. DYNAMIC PRIORITIES (in order):
   a. ACTIVE THREATS → At least 1 elimination/defense mission if threat waves exist
   b. COLONY CRITICAL RESOURCES → Scavenge/extraction if any resource < 25
   c. WEATHER HAZARDS → If severe weather, missions must acknowledge it and adjust difficulty up
   d. WAR CONFLICTS → Sabotage/elimination against enemies if factions are at war
   e. RESOURCE SCARCITY → Scavenge for scarce market commodities
   f. TERRITORY GAPS → Recon/escort for contested or unclaimed zones
   g. MODULE SYNERGIES → If colony has crafting/workshop modules, include material supply missions
   h. SURVIVOR MORALE → If morale is low, include lighter recon/escort missions
5. Fill gaps in mission type coverage
6. Vary difficulty: at least one hazardous+, at least one routine
7. REWARD SCALING:
   - Colony urgency "${colonyUrgency}": ${colonyUrgency === 'critical' ? '1.5x' : colonyUrgency === 'high' ? '1.25x' : '1x'} multiplier
   - Base: routine=5-10, hazardous=15-25, critical=30-50, suicide=60-100 rep
   - Credit: routine=50-100, hazardous=100-250, critical=250-500, suicide=500-1000
8. Write gritty, immersive 2-3 sentence briefings referencing specific world triggers
9. expires_in_hours: 12-72 (harder = longer)
10. world_trigger: short tag identifying what world state drives this mission
11. At least one mission in contested/hostile territory if any exist
12. Reference operative backstories when relevant`;

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
                objective: { type: "string" },
                type: { type: "string" },
                difficulty: { type: "string" },
                reward_reputation: { type: "number" },
                reward_credits: { type: "number" },
                reward_description: { type: "string" },
                expires_in_hours: { type: "number" },
                faction_name: { type: "string" },
                territory_name: { type: "string" },
                world_trigger: { type: "string" },
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

      let repReward = m.reward_reputation || 10;
      let creditReward = m.reward_credits || 100;
      if (colonyUrgency === 'critical') {
        repReward = Math.round(repReward * 1.5);
        creditReward = Math.round(creditReward * 1.5);
      } else if (colonyUrgency === 'high') {
        repReward = Math.round(repReward * 1.25);
        creditReward = Math.round(creditReward * 1.25);
      }

      const descParts = [m.description || ''];
      if (m.objective) descParts.push(`**OBJECTIVE:** ${m.objective}`);
      if (m.world_trigger) descParts.push(`[TRIGGER: ${m.world_trigger}]`);

      const record = await base44.asServiceRole.entities.Job.create({
        title: m.title,
        description: descParts.join('\n\n'),
        type: jobType,
        difficulty,
        status: 'available',
        faction_id: faction?.id || '',
        territory_id: territory?.id || '',
        reward_reputation: repReward,
        reward_credits: creditReward,
        reward_description: m.reward_description || '',
        expires_at: expiresAt,
      });
      created.push({ ...record, world_trigger: m.world_trigger || '' });
    }

    // Broadcast
    await base44.asServiceRole.entities.Event.create({
      title: `MISSION FORGE: ${created.length} new operations posted`,
      content: created.map(c => `• ${c.title} (${c.difficulty} ${c.type})${c.world_trigger ? ` [${c.world_trigger}]` : ''}`).join('\n'),
      type: 'system_alert',
      severity: threatenedTerritories.length > 0 ? 'warning' : 'info',
      is_active: true,
    });

    return Response.json({
      status: 'ok',
      colony_urgency: colonyUrgency,
      weather: wc ? `${wc.weather}, ${wc.season}` : 'unknown',
      active_threats: threatenedTerritories.length,
      generated: created.length,
      missions: created.map(c => ({
        title: c.title,
        type: c.type,
        difficulty: c.difficulty,
        reward_rep: c.reward_reputation,
        reward_credits: c.reward_credits,
        world_trigger: c.world_trigger,
      }))
    });
  } catch (err) {
    console.error('Mission Forge error:', err);
    return Response.json({ error: err.message }, { status: 500 });
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