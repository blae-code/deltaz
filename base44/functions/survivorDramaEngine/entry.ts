import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * survivorDramaEngine v2 — AI-powered drama generation that dynamically scales
 * complexity and narrative based on colony size, recent events, survivor
 * relationships, skills, and world state.
 *
 * Actions:
 *   { force: true/false } — generate drama (force bypasses probability)
 *   { action: "react" }   — simulate survivor AI reactions to active dramas
 */

const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200];
function getSkillLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getMoraleBand(morale) {
  if (morale <= 20) return 'desperate';
  if (morale <= 40) return 'anxious';
  if (morale <= 60) return 'neutral';
  return 'content';
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getComplexityTier(survivorCount, dramaHistory, activeThreatCount) {
  let score = 0;
  if (survivorCount >= 15) score += 3;
  else if (survivorCount >= 8) score += 2;
  else if (survivorCount >= 4) score += 1;

  if (dramaHistory >= 10) score += 2;
  else if (dramaHistory >= 5) score += 1;

  if (activeThreatCount > 0) score += 1;

  if (score >= 5) return 'epic';
  if (score >= 3) return 'complex';
  if (score >= 1) return 'layered';
  return 'simple';
}

function summarizeSurvivor(s) {
  const skills = s.skills || {};
  const topSkills = Object.entries(skills)
    .filter(([, xp]) => xp > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, xp]) => `${name}:Lv${getSkillLevel(xp)}`)
    .join(', ');
  const rels = (s.relationships || []).slice(0, 3).map(r =>
    `${r.name} (${r.type}, strength ${r.strength})`
  ).join('; ');
  return `${s.nickname || s.name} — ${s.skill} (${s.health}, morale:${s.morale}, task:${s.current_task || 'idle'}, personality:"${s.personality || 'unknown'}"${topSkills ? `, skills: ${topSkills}` : ''}${rels ? `, relationships: ${rels}` : ''})`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, force = false } = body;

    // ═══ REACT ACTION — Survivor AI reacts to active dramas ═══
    if (action === 'react') {
      const [activeDramas, survivors] = await Promise.all([
        base44.asServiceRole.entities.SurvivorDrama.filter({ status: 'active' }),
        base44.asServiceRole.entities.Survivor.filter({ status: 'active' }),
      ]);

      if (activeDramas.length === 0) {
        return Response.json({ status: 'skipped', reason: 'No active dramas to react to' });
      }

      const results = [];

      for (const drama of activeDramas) {
        // Skip dramas that already have 5+ reactions
        const existingReactions = drama.ai_reactions || [];
        if (existingReactions.length >= 5) continue;

        // Find uninvolved survivors who might react
        const involvedIds = new Set(drama.involved_survivor_ids || []);
        const reactedIds = new Set(existingReactions.map(r => r.survivor_id));
        const potentialReactors = survivors.filter(s =>
          !involvedIds.has(s.id) && !reactedIds.has(s.id)
        );

        if (potentialReactors.length === 0) continue;

        // Pick 1-3 reactors based on personality/relationships
        const reactorCount = Math.min(
          potentialReactors.length,
          Math.max(1, Math.floor(Math.random() * 3) + 1)
        );
        const shuffled = [...potentialReactors].sort(() => Math.random() - 0.5);
        const reactors = shuffled.slice(0, reactorCount);

        const reactorSummaries = reactors.map(r => summarizeSurvivor(r)).join('\n');
        const involvedNames = (drama.involved_survivor_names || []).join(', ');

        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You simulate survivor AI behavior in a post-apocalyptic colony.

ACTIVE DRAMA:
- Title: "${drama.title}"
- Type: ${drama.drama_type} (${drama.severity})
- Description: "${drama.description}"
- Involved: ${involvedNames}

SURVIVORS REACTING (each has personality, skills, relationships that affect their behavior):
${reactorSummaries}

For EACH reactor, generate a realistic autonomous reaction based on their personality, skills, and relationships:

REACTION TYPES:
- de_escalate: Tries to calm the situation (high social/leadership types)
- spread_rumor: Gossips or spreads misinformation (paranoid, anxious, social types)
- form_alliance: Sides with one party, tries to build a faction (aggressive, charismatic types)
- offer_help: Directly assists one of the involved parties (nurturing, medic types)
- avoid: Withdraws and tries to stay uninvolved (loner, stoic types)
- exploit: Tries to benefit from the chaos (aggressive, trader types)
- investigate: Tries to uncover the real story (scavenger, guard types)
- morale_boost: Attempts to rally others or lighten the mood (cheerful, cook types)

Return an array of reactions. Each reaction has:
- survivor_name: name of the reacting survivor
- reaction_type: one of the types above
- action: 1-sentence what they specifically do
- narrative: 2-sentence vivid description of their behavior
- effect: one of "positive" (helps resolve), "negative" (escalates), "neutral" (no direct effect)`,
          response_json_schema: {
            type: "object",
            properties: {
              reactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    survivor_name: { type: "string" },
                    reaction_type: { type: "string" },
                    action: { type: "string" },
                    narrative: { type: "string" },
                    effect: { type: "string" },
                  },
                },
              },
            },
          },
        });

        const newReactions = (aiResult.reactions || []).map((r, i) => ({
          survivor_id: reactors[i]?.id || '',
          survivor_name: r.survivor_name || reactors[i]?.nickname || reactors[i]?.name || 'Unknown',
          reaction_type: r.reaction_type || 'avoid',
          action: r.action || '',
          narrative: r.narrative || '',
          effect: r.effect || 'neutral',
          timestamp: new Date().toISOString(),
        }));

        const allReactions = [...existingReactions, ...newReactions].slice(0, 8);

        // Apply reaction effects to survivors
        for (let i = 0; i < newReactions.length; i++) {
          const reaction = newReactions[i];
          const reactor = reactors[i];
          if (!reactor) continue;

          const skills = { ...(reactor.skills || {}) };
          const skillLog = [...(reactor.skill_log || [])];
          
          // Award XP based on reaction type
          if (reaction.reaction_type === 'de_escalate' || reaction.reaction_type === 'morale_boost') {
            skills.leadership = (skills.leadership || 0) + 5;
            skills.social = (skills.social || 0) + 3;
            skillLog.unshift({ skill: 'leadership', xp: 5, reason: `De-escalated: ${drama.title}`, date: new Date().toISOString() });
          } else if (reaction.reaction_type === 'form_alliance' || reaction.reaction_type === 'spread_rumor') {
            skills.social = (skills.social || 0) + 4;
            skillLog.unshift({ skill: 'social', xp: 4, reason: `Social maneuvering: ${drama.title}`, date: new Date().toISOString() });
          } else if (reaction.reaction_type === 'investigate') {
            skills.survival = (skills.survival || 0) + 4;
            skillLog.unshift({ skill: 'survival', xp: 4, reason: `Investigated: ${drama.title}`, date: new Date().toISOString() });
          } else if (reaction.reaction_type === 'offer_help') {
            skills.medical = (skills.medical || 0) + 3;
            skills.social = (skills.social || 0) + 3;
            skillLog.unshift({ skill: 'social', xp: 3, reason: `Helped during: ${drama.title}`, date: new Date().toISOString() });
          }

          // Stress changes from reacting
          const stressDelta = ['spread_rumor', 'exploit'].includes(reaction.reaction_type) ? 5
            : ['de_escalate', 'morale_boost'].includes(reaction.reaction_type) ? -3
            : 0;

          await base44.asServiceRole.entities.Survivor.update(reactor.id, {
            skills,
            skill_log: skillLog.slice(0, 20),
            stress: Math.max(0, Math.min(100, (reactor.stress ?? 20) + stressDelta)),
            ai_behavior_note: `Reacted to drama "${drama.title}": ${reaction.action}`,
          });
        }

        // Count positive/negative reactions for escalation check
        const negCount = allReactions.filter(r => r.effect === 'negative').length;
        const posCount = allReactions.filter(r => r.effect === 'positive').length;
        
        const updates = { ai_reactions: allReactions };
        
        // If too many negative reactions, escalate severity
        if (negCount >= 3 && drama.severity !== 'critical') {
          const severityLadder = ['minor', 'moderate', 'serious', 'critical'];
          const idx = severityLadder.indexOf(drama.severity);
          if (idx >= 0 && idx < severityLadder.length - 1) {
            updates.severity = severityLadder[idx + 1];
          }
        }

        await base44.asServiceRole.entities.SurvivorDrama.update(drama.id, updates);
        results.push({
          drama_id: drama.id,
          drama_title: drama.title,
          reactions_added: newReactions.length,
          escalated: !!updates.severity,
          positive: posCount,
          negative: negCount,
        });
      }

      return Response.json({ status: 'ok', dramas_processed: results.length, results });
    }

    // ═══ GENERATE ACTION — AI-powered drama generation ═══
    const [colony, survivors, recentDramas, territories, worldCondList] = await Promise.all([
      base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1).then(r => r[0]),
      base44.asServiceRole.entities.Survivor.filter({ status: 'active' }),
      base44.asServiceRole.entities.SurvivorDrama.list('-created_date', 20),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.WorldConditions.list('-updated_date', 1),
    ]);

    if (!colony) {
      return Response.json({ error: 'No colony found' }, { status: 404 });
    }

    const morale = colony.morale ?? 50;
    const band = getMoraleBand(morale);

    const activeDramas = recentDramas.filter(d => d.status === 'active');
    if (activeDramas.length >= 3 && !force) {
      return Response.json({ status: 'skipped', reason: 'Too many active dramas (max 3)', active: activeDramas.length });
    }

    const probability = band === 'desperate' ? 0.9 : band === 'anxious' ? 0.65 : band === 'neutral' ? 0.3 : 0.15;
    if (Math.random() > probability && !force) {
      return Response.json({ status: 'skipped', reason: `Random check failed (${Math.round(probability * 100)}% chance)`, morale, band });
    }

    if (survivors.length < 1) {
      return Response.json({ status: 'skipped', reason: 'Not enough survivors' });
    }

    // Gather context for AI
    const world = worldCondList[0] || {};
    const activeThreatCount = territories.filter(t => t.active_threat_wave?.status === 'incoming').length;
    const complexityTier = getComplexityTier(survivors.length, recentDramas.length, activeThreatCount);

    // Recent drama types to avoid repetition
    const recentTypes = recentDramas.slice(0, 5).map(d => d.drama_type);

    // Context factors
    const contextFactors = [];
    if ((colony.food_reserves ?? 100) < 30) contextFactors.push('low_food');
    if ((colony.water_supply ?? 100) < 30) contextFactors.push('low_water');
    if ((colony.medical_supplies ?? 100) < 30) contextFactors.push('low_medical');
    if ((colony.defense_integrity ?? 100) < 30) contextFactors.push('weak_defenses');
    if (activeThreatCount > 0) contextFactors.push('active_threats');
    if (world.weather === 'radiation_storm' || world.weather === 'acid_rain') contextFactors.push('hazardous_weather');
    if (survivors.length >= 15) contextFactors.push('large_colony');
    if (survivors.length <= 4) contextFactors.push('small_colony');

    // Build survivor roster for AI
    const survivorRoster = survivors.slice(0, 20).map(s => summarizeSurvivor(s)).join('\n');

    // Active dramas for narrative continuity
    const activeDramaSummary = activeDramas.map(d =>
      `"${d.title}" (${d.drama_type}, ${d.severity}) involving ${(d.involved_survivor_names || []).join(', ')}`
    ).join('\n') || 'None';

    // Recent resolved drama outcomes
    const recentResolved = recentDramas.filter(d => d.status === 'resolved').slice(0, 3);
    const recentOutcomes = recentResolved.map(d =>
      `"${d.title}" — ${d.resolution_outcome?.slice(0, 80) || 'resolved'} [${(d.consequences || []).join(', ')}]`
    ).join('\n') || 'None';

    const complexityGuide = {
      simple: '1-2 involved survivors, straightforward scenario, 3 simple resolution options',
      layered: '2-3 involved survivors, scenario connects to colony resources or recent events, 3 options with at least 1 skill check',
      complex: '2-4 involved survivors with existing relationships factored in, multi-layered scenario that references recent dramas or world conditions, 3-4 nuanced options with skill checks and cascading consequences',
      epic: '3-5 involved survivors, an intricate scenario weaving together multiple ongoing storylines, relationships, and world events. 4 options with skill checks, faction implications, and colony-wide consequences. This should feel like a turning point.',
    };

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the drama writer for a post-apocalyptic survival colony simulation game.

═══ COLONY STATE ═══
- Colony: "${colony.colony_name}" — Population: ${colony.population || survivors.length}, Morale: ${morale}% (${band})
- Food: ${colony.food_reserves ?? 100}%, Water: ${colony.water_supply ?? 100}%, Medical: ${colony.medical_supplies ?? 100}%, Defense: ${colony.defense_integrity ?? 100}%, Power: ${colony.power_level ?? 100}%
- Weather: ${world.weather || 'unknown'}, Season: ${world.season || 'unknown'}
- Active threats: ${activeThreatCount}
- Context factors: ${contextFactors.join(', ') || 'none'}

═══ ACTIVE DRAMAS (avoid overlap) ═══
${activeDramaSummary}

═══ RECENT OUTCOMES (build on these) ═══
${recentOutcomes}

═══ SURVIVOR ROSTER ═══
${survivorRoster}

═══ RECENT DRAMA TYPES (avoid repeating) ═══
${recentTypes.join(', ') || 'none'}

═══ COMPLEXITY TIER: ${complexityTier.toUpperCase()} ═══
${complexityGuide[complexityTier]}

GENERATE a NEW drama scenario. Requirements:
1. Pick real survivors from the roster — use their actual names, personalities, skills, and relationships
2. The scenario must connect to at least one context factor or recent event
3. Avoid repeating recent drama types
4. Match the complexity tier — ${complexityTier} means ${complexityGuide[complexityTier]}
5. Resolution options should include at least one skill check (combat/crafting/medical/leadership/survival/social) with difficulty matching the severity
6. Each option should have realistic morale consequences and risk levels
7. Reference specific colony conditions in the narrative (e.g., if food is low, dramas about rationing)
8. If there are active dramas, the new drama can reference or interweave with them

Return:
- drama_type: desertion|fight|mutiny|theft|breakdown|sabotage|romance|rivalry
- severity: minor|moderate|serious|critical (scale with morale band — desperate=serious/critical, content=minor/moderate)
- title: punchy headline
- description: vivid narrative (3-5 sentences for complex/epic, 2-3 for simple/layered)
- involved_survivor_names: array of names from the roster
- context_factors: which context factors influenced this drama
- resolution_options: array of 3-4 options, each with:
  - id (snake_case), label, description, morale_effect (-10 to +10), risk (none/low/medium/high)
  - optional skill_check: { skill: "combat"|"crafting"|"medical"|"leadership"|"survival"|"social", difficulty: "easy"|"moderate"|"hard"|"extreme" }`,
      response_json_schema: {
        type: "object",
        properties: {
          drama_type: { type: "string" },
          severity: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          involved_survivor_names: { type: "array", items: { type: "string" } },
          context_factors: { type: "array", items: { type: "string" } },
          resolution_options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                description: { type: "string" },
                morale_effect: { type: "number" },
                risk: { type: "string" },
                skill_check: {
                  type: "object",
                  properties: {
                    skill: { type: "string" },
                    difficulty: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Validate and normalize AI output
    const validTypes = ['desertion', 'fight', 'mutiny', 'theft', 'breakdown', 'sabotage', 'romance', 'rivalry'];
    const validSeverities = ['minor', 'moderate', 'serious', 'critical'];
    const dramaType = validTypes.includes(aiResult.drama_type) ? aiResult.drama_type : 'breakdown';
    const severity = validSeverities.includes(aiResult.severity) ? aiResult.severity : 'moderate';

    // Match AI-returned names to actual survivor IDs
    const involvedNames = (aiResult.involved_survivor_names || []).slice(0, 5);
    const involvedIds = [];
    for (const name of involvedNames) {
      const match = survivors.find(s =>
        (s.nickname || '').toLowerCase() === name.toLowerCase() ||
        s.name.toLowerCase() === name.toLowerCase()
      );
      if (match) involvedIds.push(match.id);
    }
    // Fallback: if no matches, pick random survivors
    if (involvedIds.length === 0) {
      const shuffled = [...survivors].sort(() => Math.random() - 0.5);
      involvedIds.push(shuffled[0].id);
      involvedNames.length = 0;
      involvedNames.push(shuffled[0].nickname || shuffled[0].name);
      if (shuffled[1]) {
        involvedIds.push(shuffled[1].id);
        involvedNames.push(shuffled[1].nickname || shuffled[1].name);
      }
    }

    const drama = await base44.asServiceRole.entities.SurvivorDrama.create({
      title: aiResult.title || 'Unrest in the colony',
      description: aiResult.description || 'Something is brewing among the survivors.',
      drama_type: dramaType,
      severity,
      morale_trigger: morale,
      involved_survivor_ids: involvedIds,
      involved_survivor_names: involvedNames,
      colony_id: colony.id,
      status: 'active',
      complexity_tier: complexityTier,
      context_factors: aiResult.context_factors || contextFactors,
      resolution_options: (aiResult.resolution_options || []).slice(0, 4),
      ai_reactions: [],
    });

    await base44.asServiceRole.entities.Notification.create({
      player_email: 'broadcast',
      title: `Survivor Drama: ${aiResult.title || 'Unrest'}`,
      message: `A ${severity} ${dramaType} scenario requires GM attention. Complexity: ${complexityTier}. Colony morale: ${morale}%.`,
      type: 'colony_alert',
      priority: severity === 'critical' ? 'critical' : 'normal',
    });

    return Response.json({
      status: 'ok',
      drama_id: drama.id,
      drama_type: dramaType,
      severity,
      complexity_tier: complexityTier,
      context_factors: aiResult.context_factors || contextFactors,
      morale,
      band,
    });
  } catch (error) {
    console.error('survivorDramaEngine v2 error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});