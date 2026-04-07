import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

/**
 * resolveSurvivorDrama — GM picks a resolution option for a drama,
 * runs skill checks if the option has one, applies morale effects + XP,
 * and generates a narrative outcome.
 * Payload: { drama_id, resolution_id, check_survivor_id? }
 */

const SKILL_NAMES = ['combat', 'crafting', 'medical', 'leadership', 'survival', 'social'];
const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200];
const DIFFICULTY_TARGETS = { easy: 1, moderate: 2, hard: 3, extreme: 4, legendary: 5 };

function getSkillLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function skillCheck(skillLevel, difficulty) {
  const target = DIFFICULTY_TARGETS[difficulty] || 2;
  const diff = skillLevel - target;
  const passChance = Math.max(5, Math.min(95, 50 + diff * 15));
  const roll = Math.random() * 100;
  const passed = roll < passChance;
  const critical = passed && roll < passChance * 0.2;
  const fumble = !passed && roll > 95;
  return { passed, critical, fumble, passChance: Math.round(passChance), roll: Math.round(roll), skillLevel, difficulty };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { drama_id, resolution_id, check_survivor_id } = await req.json();
    if (!drama_id || !resolution_id) {
      return Response.json({ error: 'drama_id and resolution_id required' }, { status: 400 });
    }

    const dramas = await base44.asServiceRole.entities.SurvivorDrama.filter({ id: drama_id });
    const drama = dramas[0];
    if (!drama) return Response.json({ error: 'Drama not found' }, { status: 404 });
    if (drama.status !== 'active') return Response.json({ error: 'Drama already resolved' }, { status: 400 });

    const options = drama.resolution_options || [];
    const chosen = options.find(o => o.id === resolution_id);
    if (!chosen) return Response.json({ error: 'Invalid resolution option' }, { status: 400 });

    const consequences = [];
    let checkResult = null;
    let checkSurvivor = null;

    // ─── SKILL CHECK if the resolution has one ───
    if (chosen.skill_check && chosen.skill_check.skill && SKILL_NAMES.includes(chosen.skill_check.skill)) {
      // Find the survivor to make the check
      const checkId = check_survivor_id || (drama.involved_survivor_ids && drama.involved_survivor_ids[0]);
      if (checkId) {
        const survivors = await base44.asServiceRole.entities.Survivor.filter({ id: checkId });
        checkSurvivor = survivors[0];
      }

      if (checkSurvivor) {
        const skillXp = (checkSurvivor.skills && checkSurvivor.skills[chosen.skill_check.skill]) || 0;
        const level = getSkillLevel(skillXp);
        checkResult = skillCheck(level, chosen.skill_check.difficulty || 'moderate');

        // Award XP for the attempt
        const xpReward = checkResult.passed ? (checkResult.critical ? 25 : 15) : 5;
        const skills = { ...(checkSurvivor.skills || {}) };
        skills[chosen.skill_check.skill] = (skills[chosen.skill_check.skill] || 0) + xpReward;

        // Leadership XP for being involved in drama resolution
        skills.leadership = (skills.leadership || 0) + 5;

        const skillLog = [...(checkSurvivor.skill_log || [])].slice(0, 18);
        skillLog.unshift({
          skill: chosen.skill_check.skill,
          xp: xpReward,
          reason: `Drama: ${drama.title} — ${checkResult.passed ? (checkResult.critical ? 'CRITICAL SUCCESS' : 'passed') : (checkResult.fumble ? 'FUMBLE' : 'failed')}`,
          date: new Date().toISOString(),
        });
        skillLog.unshift({
          skill: 'leadership',
          xp: 5,
          reason: `Drama resolution: ${drama.title}`,
          date: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.Survivor.update(checkSurvivor.id, {
          skills,
          skill_log: skillLog.slice(0, 20),
        });

        consequences.push(`skill_check_${chosen.skill_check.skill}_${checkResult.passed ? 'passed' : 'failed'}`);
        consequences.push(`xp_${chosen.skill_check.skill}_+${xpReward}`);
        consequences.push(`xp_leadership_+5`);

        // Modify morale effect based on check result
        if (checkResult.critical) {
          chosen.morale_effect = Math.max((chosen.morale_effect || 0) + 5, 5);
        } else if (checkResult.fumble) {
          chosen.morale_effect = Math.min((chosen.morale_effect || 0) - 5, -5);
        } else if (!checkResult.passed) {
          // Failed check reduces positive morale or worsens negative
          chosen.morale_effect = Math.round((chosen.morale_effect || 0) * 0.5) - 2;
        }
      }
    } else {
      // No skill check — still award leadership XP to involved survivors
      for (const sid of (drama.involved_survivor_ids || []).slice(0, 3)) {
        const survivors = await base44.asServiceRole.entities.Survivor.filter({ id: sid });
        const s = survivors[0];
        if (!s) continue;
        const skills = { ...(s.skills || {}) };
        skills.leadership = (skills.leadership || 0) + 3;
        const skillLog = [...(s.skill_log || [])].slice(0, 19);
        skillLog.unshift({ skill: 'leadership', xp: 3, reason: `Drama resolved: ${drama.title}`, date: new Date().toISOString() });
        await base44.asServiceRole.entities.Survivor.update(sid, { skills, skill_log: skillLog.slice(0, 20) });
      }
      consequences.push('xp_leadership_+3');
    }

    // Apply morale effect
    const colonies = await base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1);
    const colony = colonies[0];
    if (colony && chosen.morale_effect) {
      const currentMorale = colony.morale ?? 50;
      const newMorale = Math.max(0, Math.min(100, currentMorale + chosen.morale_effect));
      await base44.asServiceRole.entities.ColonyStatus.update(colony.id, { morale: newMorale });
      consequences.push(`morale_${chosen.morale_effect > 0 ? '+' : ''}${chosen.morale_effect}`);
    }

    // Risk-based random consequence for high-risk choices
    if (chosen.risk === 'high' && Math.random() < 0.4) {
      const involvedIds = drama.involved_survivor_ids || [];
      if (involvedIds.length > 0) {
        const targetId = involvedIds[0];
        if (drama.drama_type === 'desertion' || drama.drama_type === 'mutiny') {
          await base44.asServiceRole.entities.Survivor.update(targetId, { status: 'departed', current_task: 'idle' });
          consequences.push('survivor_departed');
        } else {
          await base44.asServiceRole.entities.Survivor.update(targetId, { health: 'injured', current_task: 'idle' });
          consequences.push('survivor_injured');
        }
      }
    }

    // Generate outcome narrative (include skill check result)
    const names = (drama.involved_survivor_names || []).join(' and ');
    const checkNarrative = checkResult
      ? ` ${checkSurvivor?.nickname || checkSurvivor?.name || 'A survivor'} attempted a ${chosen.skill_check.difficulty} ${chosen.skill_check.skill} check (Lv${checkResult.skillLevel}, ${checkResult.passChance}% chance): ${checkResult.critical ? 'CRITICAL SUCCESS!' : checkResult.fumble ? 'CRITICAL FAILURE!' : checkResult.passed ? 'Success.' : 'Failed.'}`
      : '';

    const outcomePrompt = `Drama: "${drama.title}". Resolution: "${chosen.label}" — ${chosen.description}.${checkNarrative} Involved: ${names}. Consequences: ${consequences.join(', ') || 'none'}. Write a 2-sentence outcome narrative in post-apocalyptic style. ${checkResult?.critical ? 'Make the outcome exceptionally positive.' : checkResult?.fumble ? 'Make the outcome dramatically bad.' : ''}`;

    let outcome;
    try {
      outcome = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: outcomePrompt });
    } catch {
      outcome = `The GM chose to ${chosen.label.toLowerCase()}.${checkNarrative} ${consequences.length > 0 ? `Consequences: ${consequences.join(', ')}.` : ''}`;
    }

    await base44.asServiceRole.entities.SurvivorDrama.update(drama.id, {
      status: 'resolved',
      chosen_resolution: resolution_id,
      resolution_outcome: typeof outcome === 'string' ? outcome : JSON.stringify(outcome),
      resolved_by: user.email,
      resolved_at: new Date().toISOString(),
      consequences,
    });

    return Response.json({
      status: 'ok',
      outcome: typeof outcome === 'string' ? outcome : JSON.stringify(outcome),
      consequences,
      skill_check: checkResult,
      check_survivor: checkSurvivor ? (checkSurvivor.nickname || checkSurvivor.name) : null,
    });
  } catch (error) {
    console.error('resolveSurvivorDrama error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
