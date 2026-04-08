import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { deterministicBoolean, stableHash } from '../_shared/deterministic.ts';
import {
  buildDramaDraft,
  buildDramaReactions,
  buildDramaContextFactors,
  getComplexityTier,
  getMoraleBand,
} from '../_shared/survivorDramaRules.ts';
import { buildSkillLogEntry, computeCombatRating } from '../_shared/survivorSkillRules.ts';
import { DATA_ORIGINS, buildSourceRef, getCycleKey, hasSourceRef, withProvenance } from '../_shared/provenance.ts';

const reactionXpAwards: Record<string, Record<string, number>> = {
  de_escalate: { leadership: 5, social: 3 },
  morale_boost: { leadership: 5, social: 2 },
  spread_rumor: { social: 4 },
  form_alliance: { social: 4, leadership: 2 },
  investigate: { survival: 4 },
  offer_help: { medical: 3, social: 3 },
  exploit: { social: 4 },
  avoid: {},
};

const reactionStressDelta: Record<string, number> = {
  spread_rumor: 5,
  exploit: 5,
  de_escalate: -3,
  morale_boost: -3,
};

const normalizeSeverity = (value: unknown) => {
  const normalized = String(value || 'moderate').toLowerCase();
  return ['minor', 'moderate', 'serious', 'critical'].includes(normalized) ? normalized : 'moderate';
};

const applyReactorUpdate = async ({
  base44,
  survivor,
  drama,
  reaction,
  sourceRefs,
}: {
  base44: any;
  survivor: any;
  drama: any;
  reaction: any;
  sourceRefs: string[];
}) => {
  const xpAwards = reactionXpAwards[reaction.reaction_type] || {};
  const skills = { ...(survivor.skills || {}) };
  const skillLog = [...(survivor.skill_log || [])];

  for (const [skillName, xp] of Object.entries(xpAwards)) {
    skills[skillName] = Number(skills[skillName] || 0) + xp;
    skillLog.unshift(buildSkillLogEntry(skillName, xp, `${reaction.reaction_type.replace(/_/g, ' ')}: ${drama.title}`));
  }

  await base44.asServiceRole.entities.Survivor.update(
    survivor.id,
    withProvenance(
      {
        skills,
        skill_log: skillLog.slice(0, 20),
        stress: Math.max(0, Math.min(100, Number(survivor.stress ?? 20) + Number(reactionStressDelta[reaction.reaction_type] || 0))),
        ai_behavior_note: `Reacted to drama "${drama.title}": ${reaction.action}`,
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
    const action = String(body?.action || '').trim();
    const force = Boolean(body?.force);
    const cycleKey = getCycleKey(180);
    const cycleSourceRef = buildSourceRef('SurvivorDramaCycle', cycleKey);

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
        const existingReactions = Array.isArray(drama.ai_reactions) ? drama.ai_reactions : [];
        if (existingReactions.length >= 5) {
          continue;
        }

        const reactions = buildDramaReactions({
          drama,
          survivors,
          cycleKey: `${cycleKey}:${drama.id}:${existingReactions.length}`,
        });

        if (reactions.length === 0) {
          continue;
        }

        for (const reaction of reactions) {
          const survivor = survivors.find((entry) => entry.id === reaction.survivor_id);
          if (!survivor) {
            continue;
          }

          await applyReactorUpdate({
            base44,
            survivor,
            drama,
            reaction,
            sourceRefs: [
              buildSourceRef('SurvivorDrama', drama.id, 'reaction'),
              buildSourceRef('Survivor', survivor.id, reaction.reaction_type),
              cycleSourceRef,
            ].filter(Boolean),
          });
        }

        const allReactions = [...existingReactions, ...reactions].slice(0, 8);
        const negativeCount = allReactions.filter((reaction) => reaction.effect === 'negative').length;
        const positiveCount = allReactions.filter((reaction) => reaction.effect === 'positive').length;
        const severityLadder = ['minor', 'moderate', 'serious', 'critical'];
        const severityIndex = severityLadder.indexOf(normalizeSeverity(drama.severity));
        const escalated = negativeCount >= 3 && severityIndex >= 0 && severityIndex < severityLadder.length - 1;

        await base44.asServiceRole.entities.SurvivorDrama.update(
          drama.id,
          withProvenance(
            {
              ai_reactions: allReactions,
              ...(escalated ? { severity: severityLadder[severityIndex + 1] } : {}),
            },
            {
              dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
              sourceRefs: [
                buildSourceRef('SurvivorDrama', drama.id, 'reaction_batch'),
                cycleSourceRef,
              ].filter(Boolean),
            },
          ),
        );

        results.push({
          drama_id: drama.id,
          drama_title: drama.title,
          reactions_added: reactions.length,
          escalated,
          positive: positiveCount,
          negative: negativeCount,
        });
      }

      return Response.json({ status: 'ok', dramas_processed: results.length, results });
    }

    const [colony, survivors, recentDramas, territories, world] = await Promise.all([
      base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1).then((rows) => rows[0] || null),
      base44.asServiceRole.entities.Survivor.filter({ status: 'active' }),
      base44.asServiceRole.entities.SurvivorDrama.list('-created_date', 20),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.WorldConditions.list('-updated_date', 1).then((rows) => rows[0] || {}),
    ]);

    if (!colony) {
      return Response.json({ error: 'No colony found' }, { status: 404 });
    }

    if (survivors.length < 1) {
      return Response.json({ status: 'skipped', reason: 'Not enough survivors' });
    }

    const activeDramas = recentDramas.filter((drama) => drama.status === 'active');
    if (activeDramas.length >= 3 && !force) {
      return Response.json({ status: 'skipped', reason: 'Too many active dramas (max 3)', active: activeDramas.length });
    }

    if (!force && recentDramas.some((drama) => hasSourceRef(drama, cycleSourceRef))) {
      return Response.json({ status: 'skipped', reason: 'Drama already generated for this cycle' });
    }

    const morale = Number(colony.morale ?? 50);
    const band = getMoraleBand(morale);
    const probability = band === 'desperate' ? 0.9 : band === 'anxious' ? 0.65 : band === 'neutral' ? 0.3 : 0.15;
    const shouldGenerate = force || deterministicBoolean(probability, 'survivor-drama-generate', cycleKey, colony.id, activeDramas.length, survivors.length);
    if (!shouldGenerate) {
      return Response.json({
        status: 'skipped',
        reason: `Deterministic check failed (${Math.round(probability * 100)}% chance)`,
        morale,
        band,
      });
    }

    const draft = buildDramaDraft({
      colony,
      survivors,
      recentDramas,
      territories,
      world,
      cycleKey,
    });

    if (!draft) {
      return Response.json({ status: 'skipped', reason: 'No eligible drama scenario found' });
    }

    const contextFactors = buildDramaContextFactors(colony, world, territories, survivors);
    const activeThreatCount = territories.filter((territory) => territory?.active_threat_wave?.status === 'incoming').length;
    const complexityTier = draft.complexity_tier || getComplexityTier(survivors.length, recentDramas.length, activeThreatCount);
    const sourceRefs = [
      cycleSourceRef,
      buildSourceRef('ColonyStatus', colony.id, `morale:${band}`),
      ...draft.involved_survivor_ids.map((id: string) => buildSourceRef('Survivor', id, draft.drama_type)),
    ].filter(Boolean);

    const drama = await base44.asServiceRole.entities.SurvivorDrama.create(withProvenance({
      title: draft.title,
      description: draft.description,
      drama_type: draft.drama_type,
      severity: normalizeSeverity(draft.severity),
      morale_trigger: morale,
      involved_survivor_ids: draft.involved_survivor_ids,
      involved_survivor_names: draft.involved_survivor_names,
      colony_id: colony.id,
      status: 'active',
      complexity_tier: complexityTier,
      context_factors: draft.context_factors || contextFactors,
      resolution_options: draft.resolution_options,
      ai_reactions: [],
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs,
    }));

    await base44.asServiceRole.entities.Notification.create(withProvenance({
      player_email: 'broadcast',
      title: `Survivor Drama: ${draft.title}`,
      message: `A ${draft.severity} ${draft.drama_type} scenario requires GM attention. Complexity: ${complexityTier}. Colony morale: ${morale}%.`,
      type: 'colony_alert',
      priority: draft.severity === 'critical' ? 'critical' : 'normal',
    }, {
      dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
      sourceRefs: sourceRefs.concat(buildSourceRef('SurvivorDrama', drama.id)),
    }));

    return Response.json({
      status: 'ok',
      drama_id: drama.id,
      drama_type: draft.drama_type,
      severity: draft.severity,
      complexity_tier: complexityTier,
      context_factors: draft.context_factors || contextFactors,
      morale,
      band,
    });
  } catch (error) {
    console.error('survivorDramaEngine error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
});
