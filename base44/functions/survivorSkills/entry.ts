import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';
import {
  SKILL_NAMES,
  buildSkillLogEntry,
  computeCombatRating,
  getAllSkillLevels,
  getSkillLevel,
  normalizeDifficulty,
  normalizeSkillName,
  runSkillCheck,
} from '../_shared/survivorSkillRules.ts';

const normalizeXp = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));

const updateSurvivorSkills = async ({
  base44,
  survivor,
  skills,
  skillLog,
  sourceRefs,
}: {
  base44: any;
  survivor: any;
  skills: Record<string, number>;
  skillLog: any[];
  sourceRefs: string[];
}) => {
  await base44.asServiceRole.entities.Survivor.update(
    survivor.id,
    withProvenance(
      {
        skills,
        skill_log: skillLog.slice(0, 20),
        combat_rating: computeCombatRating(skills.combat || 0),
      },
      {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs,
      },
    ),
  );
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'award_xp') {
      const survivorId = String(body?.survivor_id || '').trim();
      const skill = normalizeSkillName(body?.skill);
      const xp = normalizeXp(body?.xp);
      const reason = String(body?.reason || 'Manual award').trim() || 'Manual award';

      if (!survivorId || !skill || !xp) {
        return Response.json({ error: 'survivor_id, skill, xp required' }, { status: 400 });
      }

      const survivor = (await base44.asServiceRole.entities.Survivor.filter({ id: survivorId }))[0];
      if (!survivor) {
        return Response.json({ error: 'Survivor not found' }, { status: 404 });
      }

      const skills = { ...(survivor.skills || {}) };
      const oldXp = Number(skills[skill] || 0);
      const newXp = oldXp + xp;
      const oldLevel = getSkillLevel(oldXp);
      const newLevel = getSkillLevel(newXp);
      skills[skill] = newXp;

      const skillLog = [buildSkillLogEntry(skill, xp, reason), ...(survivor.skill_log || [])].slice(0, 20);
      const sourceRefs = [
        buildSourceRef('Survivor', survivor.id, `skill:${skill}`),
        buildSourceRef('Admin', user.email, 'award_xp'),
      ].filter(Boolean);

      await updateSurvivorSkills({ base44, survivor, skills, skillLog, sourceRefs });

      const leveledUp = newLevel > oldLevel;
      if (leveledUp) {
        await base44.asServiceRole.entities.Notification.create(withProvenance({
          player_email: 'broadcast',
          title: `${survivor.nickname || survivor.name} leveled up: ${skill} Lv${newLevel}!`,
          message: `${survivor.nickname || survivor.name}'s ${skill} skill reached level ${newLevel}. Colony capabilities improved.`,
          type: 'colony_alert',
          priority: 'normal',
        }, {
          dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
          sourceRefs,
        }));
      }

      return Response.json({
        status: 'ok',
        survivor: survivor.nickname || survivor.name,
        skill,
        old_xp: oldXp,
        new_xp: newXp,
        old_level: oldLevel,
        new_level: newLevel,
        leveled_up: leveledUp,
      });
    }

    if (action === 'bulk_award') {
      const awards = Array.isArray(body?.awards) ? body.awards : null;
      if (!awards) {
        return Response.json({ error: 'awards array required' }, { status: 400 });
      }

      const grouped = new Map<string, any[]>();
      for (const award of awards) {
        const survivorId = String(award?.survivor_id || '').trim();
        const skill = normalizeSkillName(award?.skill);
        const xp = normalizeXp(award?.xp);
        if (!survivorId || !skill || !xp) {
          continue;
        }
        if (!grouped.has(survivorId)) {
          grouped.set(survivorId, []);
        }
        grouped.get(survivorId)?.push({ skill, xp, reason: String(award?.reason || 'Bulk award').trim() || 'Bulk award' });
      }

      const results = [];
      for (const [survivorId, survivorAwards] of grouped.entries()) {
        const survivor = (await base44.asServiceRole.entities.Survivor.filter({ id: survivorId }))[0];
        if (!survivor) {
          continue;
        }

        const skills = { ...(survivor.skills || {}) };
        const skillLog = [...(survivor.skill_log || [])];
        const levelUps = [];

        for (const award of survivorAwards) {
          const oldXp = Number(skills[award.skill] || 0);
          const newXp = oldXp + award.xp;
          const oldLevel = getSkillLevel(oldXp);
          const newLevel = getSkillLevel(newXp);
          skills[award.skill] = newXp;
          skillLog.unshift(buildSkillLogEntry(award.skill, award.xp, award.reason));
          if (newLevel > oldLevel) {
            levelUps.push({ skill: award.skill, level: newLevel });
          }
        }

        const sourceRefs = [
          buildSourceRef('Survivor', survivor.id, 'bulk_award'),
          buildSourceRef('Admin', user.email, 'bulk_award'),
        ].filter(Boolean);
        await updateSurvivorSkills({ base44, survivor, skills, skillLog, sourceRefs });

        results.push({
          name: survivor.nickname || survivor.name,
          awards: survivorAwards.length,
          level_ups: levelUps,
        });
      }

      return Response.json({ status: 'ok', processed: results.length, results });
    }

    if (action === 'skill_check') {
      const survivorId = String(body?.survivor_id || '').trim();
      const skill = normalizeSkillName(body?.skill);
      const difficulty = normalizeDifficulty(body?.difficulty);

      if (!survivorId || !skill) {
        return Response.json({ error: 'survivor_id and valid skill required' }, { status: 400 });
      }

      const survivor = (await base44.asServiceRole.entities.Survivor.filter({ id: survivorId }))[0];
      if (!survivor) {
        return Response.json({ error: 'Survivor not found' }, { status: 404 });
      }

      const skills = { ...(survivor.skills || {}) };
      const currentXp = Number(skills[skill] || 0);
      const level = getSkillLevel(currentXp);
      const result = runSkillCheck(
        level,
        difficulty,
        survivor.id,
        skill,
        difficulty,
        currentXp,
        Array.isArray(survivor.skill_log) ? survivor.skill_log.length : 0,
      );

      const awardXp = result.passed ? (result.critical ? 15 : 8) : 3;
      skills[skill] = currentXp + awardXp;
      const skillLog = [
        buildSkillLogEntry(
          skill,
          awardXp,
          `${difficulty} check - ${result.passed ? (result.critical ? 'CRITICAL SUCCESS' : 'passed') : (result.fumble ? 'FUMBLE' : 'failed')}`,
        ),
        ...(survivor.skill_log || []),
      ].slice(0, 20);

      const sourceRefs = [
        buildSourceRef('Survivor', survivor.id, `skill_check:${skill}`),
        buildSourceRef('Admin', user.email, 'skill_check'),
      ].filter(Boolean);
      await updateSurvivorSkills({ base44, survivor, skills, skillLog, sourceRefs });

      return Response.json({
        status: 'ok',
        survivor: survivor.nickname || survivor.name,
        check: result,
        xp_awarded: awardXp,
      });
    }

    if (action === 'get_level') {
      const survivorId = String(body?.survivor_id || '').trim();
      if (!survivorId) {
        return Response.json({ error: 'survivor_id required' }, { status: 400 });
      }

      const survivor = (await base44.asServiceRole.entities.Survivor.filter({ id: survivorId }))[0];
      if (!survivor) {
        return Response.json({ error: 'Survivor not found' }, { status: 404 });
      }

      return Response.json({
        status: 'ok',
        survivor: survivor.nickname || survivor.name,
        levels: getAllSkillLevels(survivor.skills || {}),
        skill_log: (survivor.skill_log || []).slice(0, 10),
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('survivorSkills error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
});
