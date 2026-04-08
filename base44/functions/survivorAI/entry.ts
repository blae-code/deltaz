import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { buildNeedsDrama } from '../_shared/survivorDramaRules.ts';
import { buildSkillLogEntry, computeCombatRating } from '../_shared/survivorSkillRules.ts';
import { DATA_ORIGINS, buildSourceRef, getCycleKey, hasSourceRef, withProvenance } from '../_shared/provenance.ts';
import { stableHash } from '../_shared/deterministic.ts';

const SKILL_TASK_MAP: Record<string, string> = {
  scavenger: 'scavenge',
  medic: 'heal',
  mechanic: 'repair',
  farmer: 'farm',
  guard: 'patrol',
  trader: 'trade',
  engineer: 'craft',
  cook: 'cook',
};

const TASK_NEED_EFFECTS: Record<string, Record<string, number>> = {
  scavenge: { hunger: -8, social: -5, rest: -12, stress: 5 },
  farm: { hunger: -5, social: 2, rest: -8, stress: -2 },
  craft: { hunger: -4, social: -3, rest: -6, stress: 3 },
  patrol: { hunger: -10, social: 3, rest: -15, stress: 8 },
  heal: { hunger: -3, social: 5, rest: -5, stress: -3 },
  cook: { hunger: 5, social: 8, rest: -6, stress: -5 },
  repair: { hunger: -6, social: -2, rest: -10, stress: 2 },
  trade: { hunger: -3, social: 10, rest: -4, stress: -1 },
  defend: { hunger: -12, social: 5, rest: -18, stress: 15 },
  idle: { hunger: -3, social: -8, rest: 15, stress: -5 },
};

const TASK_SKILL_XP: Record<string, Record<string, number>> = {
  scavenge: { survival: 8, combat: 2 },
  farm: { survival: 6 },
  craft: { crafting: 10 },
  patrol: { combat: 6, survival: 3 },
  heal: { medical: 10 },
  cook: { survival: 5, social: 3 },
  repair: { crafting: 8 },
  trade: { social: 8, leadership: 2 },
  defend: { combat: 12, leadership: 3 },
  idle: {},
};

const PERSONALITY_MODIFIERS: Record<string, Record<string, number>> = {
  paranoid: { social: -3, stress: 4 },
  cheerful: { social: 3, stress: -3 },
  loner: { social: -6, stress: -2 },
  aggressive: { social: -2, stress: 5 },
  nurturing: { social: 5, stress: -2 },
  anxious: { stress: 6, rest: -3 },
  stoic: { stress: -4, social: -1 },
  charismatic: { social: 8, stress: -1 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getPersonalityMods = (personality: unknown) => {
  const normalized = String(personality || '').toLowerCase();
  for (const [key, mods] of Object.entries(PERSONALITY_MODIFIERS)) {
    if (normalized.includes(key)) {
      return mods;
    }
  }
  return {};
};

const deriveMorale = (hunger: number, social: number, rest: number, stress: number) => {
  const composite = (hunger * 0.3 + social * 0.25 + rest * 0.2 + (100 - stress) * 0.25);
  if (composite >= 80) return 'thriving';
  if (composite >= 60) return 'content';
  if (composite >= 40) return 'neutral';
  if (composite >= 20) return 'anxious';
  return 'desperate';
};

const identifyNeedCrisis = (survivor: any) => {
  const crises = [];
  if ((survivor.hunger ?? 80) < 20) crises.push({ need: 'hunger', value: survivor.hunger, label: 'starving' });
  if ((survivor.social ?? 60) < 15) crises.push({ need: 'social', value: survivor.social, label: 'isolated' });
  if ((survivor.rest ?? 70) < 15) crises.push({ need: 'rest', value: survivor.rest, label: 'exhausted' });
  if ((survivor.stress ?? 20) > 80) crises.push({ need: 'stress', value: survivor.stress, label: 'breaking point' });
  return crises;
};

const pickDeterministicTask = (options: string[], ...parts: unknown[]) => {
  if (options.length === 0) {
    return 'idle';
  }
  return options[stableHash('survivor-ai-task', ...parts) % options.length];
};

const pickBestTask = (survivor: any, colony: any, baseDefenseNeeded: boolean, cycleKey: string) => {
  const hunger = Number(survivor.hunger ?? 80);
  const social = Number(survivor.social ?? 60);
  const rest = Number(survivor.rest ?? 70);
  const stress = Number(survivor.stress ?? 20);

  if (rest < 20) return 'idle';
  if (hunger < 25 && survivor.skill === 'farmer') return 'farm';
  if (hunger < 25 && survivor.skill === 'cook') return 'cook';

  if (colony) {
    if ((colony.food_reserves ?? 100) < 30) {
      if (survivor.skill === 'farmer') return 'farm';
      if (survivor.skill === 'cook') return 'cook';
      if (survivor.skill === 'scavenger') return 'scavenge';
    }
    if ((colony.defense_integrity ?? 100) < 30 || baseDefenseNeeded) {
      if (survivor.skill === 'guard') return 'patrol';
      if (survivor.skill === 'mechanic') return 'repair';
    }
    if ((colony.medical_supplies ?? 100) < 30 && survivor.skill === 'medic') {
      return 'heal';
    }
  }

  if (social < 25) {
    const socialTasks = ['cook', 'trade', 'heal'].filter((task) => Object.values(SKILL_TASK_MAP).includes(task));
    return SKILL_TASK_MAP[survivor.skill] && socialTasks.includes(SKILL_TASK_MAP[survivor.skill])
      ? SKILL_TASK_MAP[survivor.skill]
      : pickDeterministicTask(['cook', 'trade'], cycleKey, survivor.id, 'social');
  }

  if (stress > 70) {
    return pickDeterministicTask(['idle', 'cook', 'farm'], cycleKey, survivor.id, 'stress');
  }

  return SKILL_TASK_MAP[survivor.skill] || 'scavenge';
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action = 'tick' } = await req.json().catch(() => ({}));
    const cycleKey = getCycleKey(120);
    const cycleSourceRef = buildSourceRef('SurvivorAICycle', cycleKey);

    const [survivors, colonies, bases, territories, activeDramas] = await Promise.all([
      base44.asServiceRole.entities.Survivor.filter({ status: 'active' }),
      base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1),
      base44.asServiceRole.entities.PlayerBase.filter({ status: 'active' }),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.SurvivorDrama.filter({ status: 'active' }),
    ]);

    const colony = colonies[0] || null;
    const now = new Date().toISOString();
    const threatenedSectors = territories.filter((territory) => territory?.active_threat_wave?.status === 'incoming').map((territory) => territory.sector);
    const basesUnderThreat = bases.filter((base) => threatenedSectors.includes(base.sector));

    if (action === 'auto_assign' || action === 'tick') {
      const assignments = [];
      for (const survivor of survivors.filter((entry) => entry.current_task === 'idle')) {
        const survivorBase = bases.find((base) => base.id === survivor.base_id);
        const baseUnderThreat = Boolean(survivorBase && basesUnderThreat.some((base) => base.id === survivorBase.id));
        const task = pickBestTask(survivor, colony, baseUnderThreat, cycleKey);

        if (task !== 'idle') {
          await base44.asServiceRole.entities.Survivor.update(
            survivor.id,
            withProvenance(
              {
                current_task: task,
                task_started_at: now,
              },
              {
                dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
                sourceRefs: [
                  buildSourceRef('Survivor', survivor.id, 'auto_assign'),
                  cycleSourceRef,
                ].filter(Boolean),
              },
            ),
          );
          assignments.push({ name: survivor.nickname || survivor.name, task, reason: 'AI auto-assign' });
        }
      }

      if (action === 'auto_assign') {
        return Response.json({ status: 'ok', assignments });
      }
    }

    const needsUpdates = [];
    const dramaTriggers = [];
    const relationshipChanges = [];
    const skillXpAwarded = [];

    for (const survivor of survivors) {
      if (survivor.last_ai_tick_cycle === cycleKey || hasSourceRef(survivor, cycleSourceRef)) {
        needsUpdates.push({
          name: survivor.nickname || survivor.name,
          hunger: Number(survivor.hunger ?? 80),
          social: Number(survivor.social ?? 60),
          rest: Number(survivor.rest ?? 70),
          stress: Number(survivor.stress ?? 20),
          morale: survivor.morale || 'neutral',
          crises: identifyNeedCrisis(survivor).map((crisis) => crisis.label),
        });
        continue;
      }

      const task = survivor.current_task || 'idle';
      const effects = TASK_NEED_EFFECTS[task] || TASK_NEED_EFFECTS.idle;
      const personalityMods = getPersonalityMods(survivor.personality);

      let hungerDelta = Number(effects.hunger || 0) + Number(personalityMods.hunger || 0);
      let socialDelta = Number(effects.social || 0) + Number(personalityMods.social || 0);
      let restDelta = Number(effects.rest || 0) + Number(personalityMods.rest || 0);
      let stressDelta = Number(effects.stress || 0) + Number(personalityMods.stress || 0);

      if (['injured', 'sick'].includes(String(survivor.health || ''))) {
        hungerDelta -= 5;
        restDelta -= 5;
        stressDelta += 5;
      }
      if (survivor.health === 'critical') {
        hungerDelta -= 10;
        restDelta -= 10;
        stressDelta += 12;
      }
      if (colony && (colony.food_reserves ?? 100) < 25) {
        hungerDelta -= 8;
      }

      const survivorBase = bases.find((base) => base.id === survivor.base_id);
      if (survivorBase && basesUnderThreat.some((base) => base.id === survivorBase.id)) {
        stressDelta += 10;
      }

      const newHunger = clamp(Number(survivor.hunger ?? 80) + hungerDelta, 0, 100);
      const newSocial = clamp(Number(survivor.social ?? 60) + socialDelta, 0, 100);
      const newRest = clamp(Number(survivor.rest ?? 70) + restDelta, 0, 100);
      const newStress = clamp(Number(survivor.stress ?? 20) + stressDelta, 0, 100);
      const newMorale = deriveMorale(newHunger, newSocial, newRest, newStress);

      const taskXp = TASK_SKILL_XP[task] || {};
      const skills = { ...(survivor.skills || {}) };
      const skillLog = [...(survivor.skill_log || [])];
      const xpGains = [];

      for (const [skillName, baseXp] of Object.entries(taskXp)) {
        const primaryMatch = SKILL_TASK_MAP[survivor.skill] === task;
        const xp = primaryMatch ? Math.round(baseXp * 1.5) : baseXp;
        skills[skillName] = Number(skills[skillName] || 0) + xp;
        skillLog.unshift(buildSkillLogEntry(skillName, xp, `${task} task`));
        xpGains.push({ skill: skillName, xp });
      }
      if (xpGains.length > 0) {
        skillXpAwarded.push({ name: survivor.nickname || survivor.name, gains: xpGains });
      }

      const sameBaseSameTask = survivors.filter((other) =>
        other.id !== survivor.id
        && other.base_id === survivor.base_id
        && other.current_task === survivor.current_task
        && survivor.current_task !== 'idle');

      const relationships = [...(survivor.relationships || [])];
      for (const other of sameBaseSameTask.slice(0, 3)) {
        const existing = relationships.find((entry) => entry.survivor_id === other.id);
        if (existing) {
          existing.strength = clamp(Number(existing.strength || 0) + 2, -10, 10);
        } else {
          relationships.push({
            survivor_id: other.id,
            name: other.nickname || other.name,
            type: 'colleague',
            strength: 1,
          });
          relationshipChanges.push({ from: survivor.nickname || survivor.name, to: other.nickname || other.name, type: 'new bond' });
        }
      }

      if (sameBaseSameTask.length > 0 && ['cook', 'trade', 'heal'].includes(task)) {
        const socialBonus = Math.min(5, sameBaseSameTask.length * 2);
        skills.social = Number(skills.social || 0) + socialBonus;
        skillLog.unshift(buildSkillLogEntry('social', socialBonus, `teamwork (${sameBaseSameTask.length} colleagues)`));
      }

      const crises = identifyNeedCrisis({ hunger: newHunger, social: newSocial, rest: newRest, stress: newStress });
      for (const crisis of crises) {
        dramaTriggers.push({
          survivor_id: survivor.id,
          survivor_name: survivor.nickname || survivor.name,
          personality: survivor.personality,
          need: crisis.need,
          value: crisis.value,
          label: crisis.label,
          task: survivor.current_task,
          health: survivor.health,
          relationships: relationships.slice(0, 3),
        });
      }

      const nextTask = newRest < 10 && survivor.current_task !== 'idle' ? 'idle' : survivor.current_task;
      await base44.asServiceRole.entities.Survivor.update(
        survivor.id,
        withProvenance(
          {
            hunger: newHunger,
            social: newSocial,
            rest: newRest,
            stress: newStress,
            morale: newMorale,
            last_needs_update: now,
            last_ai_tick_cycle: cycleKey,
            relationships: relationships.slice(0, 10),
            current_task: nextTask,
            skills,
            skill_log: skillLog.slice(0, 20),
            ai_behavior_note: `${task} duty updated during survivor AI cycle ${cycleKey}.`,
            combat_rating: computeCombatRating(skills.combat || 0),
            ...(nextTask !== survivor.current_task ? { task_started_at: now } : {}),
          },
          {
            dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
            sourceRefs: [
              buildSourceRef('Survivor', survivor.id, 'needs_tick'),
              cycleSourceRef,
            ].filter(Boolean),
          },
        ),
      );

      needsUpdates.push({
        name: survivor.nickname || survivor.name,
        hunger: newHunger,
        social: newSocial,
        rest: newRest,
        stress: newStress,
        morale: newMorale,
        crises: crises.map((crisis) => crisis.label),
      });
    }

    let generatedDrama = null;
    if (dramaTriggers.length > 0 && activeDramas.length < 5) {
      const trigger = [...dramaTriggers].sort((left, right) => {
        const leftScore = left.need === 'stress' ? Number(left.value || 0) : 100 - Number(left.value || 0);
        const rightScore = right.need === 'stress' ? Number(right.value || 0) : 100 - Number(right.value || 0);
        return rightScore - leftScore;
      })[0];

      const existingDramaThisCycle = await base44.asServiceRole.entities.SurvivorDrama.list('-created_date', 10)
        .then((rows) => rows.find((row: any) => hasSourceRef(row, cycleSourceRef)));

      if (!existingDramaThisCycle) {
        const draft = buildNeedsDrama({
          trigger,
          colony,
          survivors,
          cycleKey,
        });

        const drama = await base44.asServiceRole.entities.SurvivorDrama.create(withProvenance({
          title: draft.title,
          description: draft.description,
          drama_type: draft.drama_type,
          severity: draft.severity,
          morale_trigger: null,
          involved_survivor_ids: draft.involved_survivor_ids,
          involved_survivor_names: draft.involved_survivor_names,
          colony_id: colony?.id || '',
          status: 'active',
          context_factors: draft.context_factors,
          resolution_options: draft.resolution_options,
          ai_reactions: [],
        }, {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs: [
            cycleSourceRef,
            buildSourceRef('Survivor', trigger.survivor_id, `need:${trigger.need}`),
          ].filter(Boolean),
        }));

        await base44.asServiceRole.entities.Survivor.update(
          trigger.survivor_id,
          withProvenance(
            {
              ai_behavior_note: `${trigger.label} - drama event generated: ${draft.title}`,
            },
            {
              dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
              sourceRefs: [
                cycleSourceRef,
                buildSourceRef('SurvivorDrama', drama.id),
              ].filter(Boolean),
            },
          ),
        );

        await base44.asServiceRole.entities.Notification.create(withProvenance({
          player_email: 'broadcast',
          title: `⚠ ${draft.title}`,
          message: `${trigger.survivor_name} is ${trigger.label}. ${draft.severity} ${draft.drama_type} requires attention.`,
          type: 'colony_alert',
          priority: draft.severity === 'critical' ? 'critical' : 'normal',
        }, {
          dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
          sourceRefs: [
            cycleSourceRef,
            buildSourceRef('SurvivorDrama', drama.id),
          ].filter(Boolean),
        }));

        generatedDrama = {
          id: drama.id,
          title: draft.title,
          type: draft.drama_type,
          severity: draft.severity,
          trigger_need: trigger.need,
          trigger_label: trigger.label,
        };
      }
    }

    return Response.json({
      status: 'ok',
      survivors_processed: survivors.length,
      needs_updates: needsUpdates.length,
      drama_triggers: dramaTriggers.length,
      relationship_changes: relationshipChanges.length,
      skill_xp_awarded: skillXpAwarded.length,
      generated_drama: generatedDrama,
      summary: {
        avg_hunger: Math.round(needsUpdates.reduce((sum, update) => sum + Number(update.hunger || 0), 0) / (needsUpdates.length || 1)),
        avg_social: Math.round(needsUpdates.reduce((sum, update) => sum + Number(update.social || 0), 0) / (needsUpdates.length || 1)),
        avg_rest: Math.round(needsUpdates.reduce((sum, update) => sum + Number(update.rest || 0), 0) / (needsUpdates.length || 1)),
        avg_stress: Math.round(needsUpdates.reduce((sum, update) => sum + Number(update.stress || 0), 0) / (needsUpdates.length || 1)),
        in_crisis: dramaTriggers.length,
        xp_gains: skillXpAwarded.length,
      },
    });
  } catch (error) {
    console.error('survivorAI error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
});
