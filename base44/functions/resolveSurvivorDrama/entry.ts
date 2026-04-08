import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { deterministicBoolean } from '../_shared/deterministic.ts';
import { buildDramaOutcomeNarrative } from '../_shared/survivorDramaRules.ts';
import {
  buildSkillLogEntry,
  computeCombatRating,
  getSkillLevel,
  normalizeSkillName,
  runSkillCheck,
} from '../_shared/survivorSkillRules.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeResolutionOption = (option: any) => {
  const skill = normalizeSkillName(option?.skill_check?.skill);
  return {
    ...option,
    morale_effect: Number(option?.morale_effect || 0),
    risk: ['none', 'low', 'medium', 'high'].includes(String(option?.risk || '').toLowerCase())
      ? String(option.risk).toLowerCase()
      : 'medium',
    skill_check: skill
      ? {
          skill,
          difficulty: String(option?.skill_check?.difficulty || 'moderate').toLowerCase(),
        }
      : null,
  };
};

const updateSurvivor = async ({
  base44,
  survivor,
  updates,
  sourceRefs,
}: {
  base44: any;
  survivor: any;
  updates: Record<string, unknown>;
  sourceRefs: string[];
}) => {
  await base44.asServiceRole.entities.Survivor.update(
    survivor.id,
    withProvenance(updates as any, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs,
    }),
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
    const dramaId = String(body?.drama_id || '').trim();
    const resolutionId = String(body?.resolution_id || '').trim();
    const requestedCheckerId = String(body?.check_survivor_id || '').trim();
    if (!dramaId || !resolutionId) {
      return Response.json({ error: 'drama_id and resolution_id required' }, { status: 400 });
    }

    const drama = (await base44.asServiceRole.entities.SurvivorDrama.filter({ id: dramaId }))[0];
    if (!drama) {
      return Response.json({ error: 'Drama not found' }, { status: 404 });
    }
    if (drama.status !== 'active') {
      return Response.json({ error: 'Drama already resolved' }, { status: 400 });
    }

    const chosen = (Array.isArray(drama.resolution_options) ? drama.resolution_options : [])
      .map(normalizeResolutionOption)
      .find((option: any) => option?.id === resolutionId);
    if (!chosen) {
      return Response.json({ error: 'Invalid resolution option' }, { status: 400 });
    }

    const involvedIds = Array.isArray(drama.involved_survivor_ids) ? drama.involved_survivor_ids.filter(Boolean) : [];
    const involvedSurvivors = involvedIds.length > 0
      ? await Promise.all(involvedIds.map((id: string) => base44.asServiceRole.entities.Survivor.filter({ id }).then((rows: any[]) => rows[0] || null)))
      : [];
    const validInvolved = involvedSurvivors.filter(Boolean);

    let checkSurvivor = null;
    let checkResult = null;
    let adjustedMoraleEffect = Number(chosen.morale_effect || 0);
    const consequences: string[] = [];
    const dramaSourceRefs = [
      buildSourceRef('SurvivorDrama', drama.id, resolutionId),
      buildSourceRef('Admin', user.email, 'resolveSurvivorDrama'),
    ].filter(Boolean);

    if (chosen.skill_check?.skill) {
      const fallbackSurvivor = validInvolved[0] || null;
      const requested = requestedCheckerId
        ? (await base44.asServiceRole.entities.Survivor.filter({ id: requestedCheckerId }))[0]
        : null;
      checkSurvivor = requested || fallbackSurvivor;

      if (checkSurvivor) {
        const skillName = chosen.skill_check.skill;
        const survivorSkills = { ...(checkSurvivor.skills || {}) };
        const currentXp = Number(survivorSkills[skillName] || 0);
        const skillLevel = getSkillLevel(currentXp);
        checkResult = runSkillCheck(
          skillLevel,
          chosen.skill_check.difficulty,
          drama.id,
          resolutionId,
          checkSurvivor.id,
          currentXp,
          Array.isArray(checkSurvivor.skill_log) ? checkSurvivor.skill_log.length : 0,
        );

        const skillXp = checkResult.passed ? (checkResult.critical ? 25 : 15) : 5;
        survivorSkills[skillName] = currentXp + skillXp;
        survivorSkills.leadership = Number(survivorSkills.leadership || 0) + 5;

        const skillLog = [
          buildSkillLogEntry(
            skillName,
            skillXp,
            `Drama: ${drama.title} - ${checkResult.passed ? (checkResult.critical ? 'CRITICAL SUCCESS' : 'passed') : (checkResult.fumble ? 'FUMBLE' : 'failed')}`,
          ),
          buildSkillLogEntry('leadership', 5, `Drama resolution: ${drama.title}`),
          ...(checkSurvivor.skill_log || []),
        ].slice(0, 20);

        await updateSurvivor({
          base44,
          survivor: checkSurvivor,
          updates: {
            skills: survivorSkills,
            skill_log: skillLog,
            combat_rating: computeCombatRating(survivorSkills.combat || 0),
          },
          sourceRefs: dramaSourceRefs.concat(buildSourceRef('Survivor', checkSurvivor.id, `skill:${skillName}`)),
        });

        consequences.push(`skill_check_${skillName}_${checkResult.passed ? 'passed' : 'failed'}`);
        consequences.push(`xp_${skillName}_+${skillXp}`);
        consequences.push('xp_leadership_+5');

        if (checkResult.critical) {
          adjustedMoraleEffect = Math.max(adjustedMoraleEffect + 5, 5);
        } else if (checkResult.fumble) {
          adjustedMoraleEffect = Math.min(adjustedMoraleEffect - 5, -5);
        } else if (!checkResult.passed) {
          adjustedMoraleEffect = Math.round(adjustedMoraleEffect * 0.5) - 2;
        }
      }
    } else {
      for (const survivor of validInvolved.slice(0, 3)) {
        const skills = { ...(survivor.skills || {}) };
        skills.leadership = Number(skills.leadership || 0) + 3;
        const skillLog = [
          buildSkillLogEntry('leadership', 3, `Drama resolved: ${drama.title}`),
          ...(survivor.skill_log || []),
        ].slice(0, 20);

        await updateSurvivor({
          base44,
          survivor,
          updates: {
            skills,
            skill_log: skillLog,
            combat_rating: computeCombatRating(skills.combat || 0),
          },
          sourceRefs: dramaSourceRefs.concat(buildSourceRef('Survivor', survivor.id, 'leadership')),
        });
      }
      consequences.push('xp_leadership_+3');
    }

    const colony = (await base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1))[0];
    if (colony && adjustedMoraleEffect !== 0) {
      const currentMorale = Number(colony.morale ?? 50);
      const nextMorale = clamp(currentMorale + adjustedMoraleEffect, 0, 100);
      await base44.asServiceRole.entities.ColonyStatus.update(
        colony.id,
        withProvenance(
          { morale: nextMorale },
          {
            dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
            sourceRefs: dramaSourceRefs.concat(buildSourceRef('ColonyStatus', colony.id, 'morale')),
          },
        ),
      );
      consequences.push(`morale_${adjustedMoraleEffect > 0 ? '+' : ''}${adjustedMoraleEffect}`);
    }

    const highRiskFailure = chosen.risk === 'high'
      && deterministicBoolean(
        checkResult?.fumble ? 0.85 : checkResult && !checkResult.passed ? 0.55 : 0.35,
        'resolve-drama-risk',
        drama.id,
        resolutionId,
        drama.drama_type,
        checkSurvivor?.id || validInvolved[0]?.id || 'none',
      );
    const mediumRiskFailure = chosen.risk === 'medium'
      && checkResult
      && !checkResult.passed
      && deterministicBoolean(0.35, 'resolve-drama-medium-risk', drama.id, resolutionId);

    if ((highRiskFailure || mediumRiskFailure) && validInvolved.length > 0) {
      const target = validInvolved[0];
      if (['desertion', 'mutiny'].includes(String(drama.drama_type || ''))) {
        await updateSurvivor({
          base44,
          survivor: target,
          updates: {
            status: 'departed',
            current_task: 'idle',
          },
          sourceRefs: dramaSourceRefs.concat(buildSourceRef('Survivor', target.id, 'departed')),
        });
        consequences.push('survivor_departed');
      } else {
        await updateSurvivor({
          base44,
          survivor: target,
          updates: {
            health: target.health === 'critical' ? 'critical' : 'injured',
            current_task: 'idle',
          },
          sourceRefs: dramaSourceRefs.concat(buildSourceRef('Survivor', target.id, 'injured')),
        });
        consequences.push('survivor_injured');
      }
    }

    const outcome = buildDramaOutcomeNarrative({
      drama,
      choice: { ...chosen, morale_effect: adjustedMoraleEffect },
      checkResult,
      checkSurvivorName: checkSurvivor ? (checkSurvivor.nickname || checkSurvivor.name) : null,
      consequences,
    });

    await base44.asServiceRole.entities.SurvivorDrama.update(
      drama.id,
      withProvenance(
        {
          status: 'resolved',
          chosen_resolution: resolutionId,
          resolution_outcome: outcome,
          resolved_by: user.email,
          resolved_at: new Date().toISOString(),
          consequences,
        },
        {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs: dramaSourceRefs,
        },
      ),
    );

    return Response.json({
      status: 'ok',
      outcome,
      consequences,
      skill_check: checkResult,
      check_survivor: checkSurvivor ? (checkSurvivor.nickname || checkSurvivor.name) : null,
    });
  } catch (error) {
    console.error('resolveSurvivorDrama error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
});
