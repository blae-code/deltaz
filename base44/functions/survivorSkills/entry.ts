import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

/**
 * survivorSkills — Manage survivor skill XP and level-ups.
 *
 * Actions:
 *   { action: "award_xp", survivor_id, skill, xp, reason }
 *   { action: "bulk_award", awards: [{ survivor_id, skill, xp, reason }] }
 *   { action: "skill_check", survivor_id, skill, difficulty }  — returns pass/fail + narrative
 *   { action: "get_level", survivor_id }  — returns all skill levels
 */

// XP thresholds for each level (cumulative)
const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200];
// Level 1: 0-49, Level 2: 50-149, Level 3: 150-349, Level 4: 350-699, Level 5: 700-1199, Level 6: 1200+

const SKILL_NAMES = ['combat', 'crafting', 'medical', 'leadership', 'survival', 'social'];

// Difficulty check targets (skill level needed for 50% pass rate)
const DIFFICULTY_TARGETS = {
  easy: 1,
  moderate: 2,
  hard: 3,
  extreme: 4,
  legendary: 5,
};

function getSkillLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getSkillProgress(xp) {
  const level = getSkillLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 500;
  const progress = xp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  return { level, xp, progress, needed, percent: Math.min(100, Math.round((progress / needed) * 100)) };
}

function getAllSkillLevels(skills) {
  const result = {};
  for (const name of SKILL_NAMES) {
    const xp = (skills && skills[name]) || 0;
    result[name] = getSkillProgress(xp);
  }
  return result;
}

function skillCheck(skillLevel, difficulty) {
  const target = DIFFICULTY_TARGETS[difficulty] || 2;
  // Base pass chance: 30% + 15% per level above target, -15% per level below
  const diff = skillLevel - target;
  const passChance = Math.max(5, Math.min(95, 50 + diff * 15));
  const roll = Math.random() * 100;
  const passed = roll < passChance;
  const critical = passed && roll < passChance * 0.2; // Critical success
  const fumble = !passed && roll > 95; // Critical failure
  return { passed, critical, fumble, passChance, roll: Math.round(roll), skillLevel, difficulty };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ─── AWARD XP ───
    if (action === 'award_xp') {
      const { survivor_id, skill, xp, reason } = body;
      if (!survivor_id || !SKILL_NAMES.includes(skill) || !xp) {
        return Response.json({ error: 'survivor_id, skill, xp required' }, { status: 400 });
      }

      const survivors = await base44.asServiceRole.entities.Survivor.filter({ id: survivor_id });
      const s = survivors[0];
      if (!s) return Response.json({ error: 'Survivor not found' }, { status: 404 });

      const skills = s.skills || {};
      const oldXp = skills[skill] || 0;
      const newXp = oldXp + xp;
      const oldLevel = getSkillLevel(oldXp);
      const newLevel = getSkillLevel(newXp);

      skills[skill] = newXp;

      // Add to skill log (keep last 20)
      const log = (s.skill_log || []).slice(0, 19);
      log.unshift({ skill, xp, reason: reason || 'Manual award', date: new Date().toISOString() });

      // Update combat_rating based on combat skill
      const updates = { skills, skill_log: log };
      if (skill === 'combat') {
        updates.combat_rating = Math.min(10, newLevel + Math.floor(newXp / 200));
      }

      await base44.asServiceRole.entities.Survivor.update(survivor_id, updates);

      const leveledUp = newLevel > oldLevel;
      if (leveledUp) {
        await base44.asServiceRole.entities.Notification.create({
          player_email: 'broadcast',
          title: `${s.nickname || s.name} leveled up: ${skill} Lv${newLevel}!`,
          message: `${s.nickname || s.name}'s ${skill} skill reached level ${newLevel}. Colony capabilities improved.`,
          type: 'colony_alert',
          priority: 'normal',
        });
      }

      return Response.json({
        status: 'ok',
        survivor: s.nickname || s.name,
        skill,
        old_xp: oldXp,
        new_xp: newXp,
        old_level: oldLevel,
        new_level: newLevel,
        leveled_up: leveledUp,
      });
    }

    // ─── BULK AWARD ───
    if (action === 'bulk_award') {
      const { awards } = body;
      if (!Array.isArray(awards)) return Response.json({ error: 'awards array required' }, { status: 400 });

      const results = [];
      // Group by survivor for efficiency
      const bySurvivor = {};
      for (const a of awards) {
        if (!a.survivor_id || !SKILL_NAMES.includes(a.skill)) continue;
        if (!bySurvivor[a.survivor_id]) bySurvivor[a.survivor_id] = [];
        bySurvivor[a.survivor_id].push(a);
      }

      for (const [sid, sAwards] of Object.entries(bySurvivor)) {
        const survivors = await base44.asServiceRole.entities.Survivor.filter({ id: sid });
        const s = survivors[0];
        if (!s) continue;

        const skills = { ...(s.skills || {}) };
        const log = [...(s.skill_log || [])];
        const levelUps = [];

        for (const a of sAwards) {
          const oldXp = skills[a.skill] || 0;
          const newXp = oldXp + (a.xp || 0);
          const oldLevel = getSkillLevel(oldXp);
          const newLevel = getSkillLevel(newXp);
          skills[a.skill] = newXp;
          log.unshift({ skill: a.skill, xp: a.xp, reason: a.reason || 'Bulk award', date: new Date().toISOString() });
          if (newLevel > oldLevel) levelUps.push({ skill: a.skill, level: newLevel });
        }

        const updates = { skills, skill_log: log.slice(0, 20) };
        if (skills.combat !== undefined) {
          updates.combat_rating = Math.min(10, getSkillLevel(skills.combat) + Math.floor((skills.combat || 0) / 200));
        }
        await base44.asServiceRole.entities.Survivor.update(sid, updates);

        results.push({ name: s.nickname || s.name, awards: sAwards.length, level_ups: levelUps });
      }

      return Response.json({ status: 'ok', processed: results.length, results });
    }

    // ─── SKILL CHECK ───
    if (action === 'skill_check') {
      const { survivor_id, skill, difficulty } = body;
      if (!survivor_id || !SKILL_NAMES.includes(skill)) {
        return Response.json({ error: 'survivor_id and valid skill required' }, { status: 400 });
      }

      const survivors = await base44.asServiceRole.entities.Survivor.filter({ id: survivor_id });
      const s = survivors[0];
      if (!s) return Response.json({ error: 'Survivor not found' }, { status: 404 });

      const xp = (s.skills && s.skills[skill]) || 0;
      const level = getSkillLevel(xp);
      const result = skillCheck(level, difficulty || 'moderate');

      // Award small XP for attempting a check (more on pass)
      const awardXp = result.passed ? (result.critical ? 15 : 8) : 3;
      const skills = { ...(s.skills || {}) };
      skills[skill] = (skills[skill] || 0) + awardXp;
      const log = [...(s.skill_log || [])].slice(0, 19);
      log.unshift({ skill, xp: awardXp, reason: `${difficulty} check — ${result.passed ? (result.critical ? 'CRITICAL SUCCESS' : 'passed') : (result.fumble ? 'FUMBLE' : 'failed')}`, date: new Date().toISOString() });
      await base44.asServiceRole.entities.Survivor.update(survivor_id, { skills, skill_log: log });

      return Response.json({
        status: 'ok',
        survivor: s.nickname || s.name,
        check: result,
        xp_awarded: awardXp,
      });
    }

    // ─── GET LEVELS ───
    if (action === 'get_level') {
      const { survivor_id } = body;
      const survivors = await base44.asServiceRole.entities.Survivor.filter({ id: survivor_id });
      const s = survivors[0];
      if (!s) return Response.json({ error: 'Survivor not found' }, { status: 404 });

      return Response.json({
        status: 'ok',
        survivor: s.nickname || s.name,
        levels: getAllSkillLevels(s.skills),
        skill_log: (s.skill_log || []).slice(0, 10),
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('survivorSkills error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
