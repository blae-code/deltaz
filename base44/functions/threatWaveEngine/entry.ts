import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { deterministicBoolean, deterministicNumber, pickDeterministic } from '../_shared/deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, getCycleKey, withProvenance } from '../_shared/provenance.ts';
import { computeCombatRating, getSkillLevel } from '../_shared/survivorSkillRules.ts';

const WAVE_ARCHETYPES = [
  {
    type: 'horde',
    behavior: 'swarm',
    can_split: true,
    names: ['Zombie Horde', 'Shambler Swarm', 'Dead Tide', 'Rotting Legion'],
    strengths: ['fog', 'ashfall', 'dust_storm'],
    weaknesses: ['thunderstorm', 'blizzard'],
    season_bonus: { nuclear_winter: 0.2, autumn: 0.1 },
    base_morale_damage: 5,
  },
  {
    type: 'raiders',
    behavior: 'targeted',
    can_split: false,
    names: ['Raider War Party', 'Bandit Assault', 'Scavenger Gang', 'Marauder Blitz'],
    strengths: ['clear', 'overcast'],
    weaknesses: ['heavy_rain', 'blizzard', 'dust_storm'],
    season_bonus: { dry_season: 0.15, summer: 0.1 },
    base_morale_damage: 3,
  },
  {
    type: 'mutants',
    behavior: 'adaptive',
    can_split: true,
    names: ['Mutant Pack', 'Irradiated Beasts', 'Glowing Stalkers', 'Toxic Crawlers'],
    strengths: ['radiation_storm', 'acid_rain', 'ashfall', 'fog'],
    weaknesses: ['clear', 'snow'],
    season_bonus: { nuclear_winter: 0.25, monsoon: 0.08 },
    base_morale_damage: 7,
  },
  {
    type: 'storm',
    behavior: 'area',
    can_split: false,
    names: ['Radiation Front', 'Acid Rain Wall', 'Ash Tempest', 'Toxic Miasma'],
    strengths: ['radiation_storm', 'dust_storm', 'ashfall', 'acid_rain'],
    weaknesses: [],
    season_bonus: { nuclear_winter: 0.25, monsoon: 0.15 },
    base_morale_damage: 4,
  },
  {
    type: 'siege',
    behavior: 'siege',
    can_split: false,
    names: ['Organized Siege Force', 'Armored Convoy', 'Fortification Breakers', 'Militia Assault Column'],
    strengths: ['clear', 'overcast'],
    weaknesses: ['heavy_rain', 'thunderstorm', 'blizzard', 'dust_storm'],
    season_bonus: { dry_season: 0.15, summer: 0.1 },
    base_morale_damage: 10,
  },
];

const SPECIAL_MODIFIERS = [
  { id: 'flanking', label: 'Flanking Maneuver', strength_mult: 1.2, description: 'Attack splits to hit from two directions', counter: 'watchtower' },
  { id: 'armored', label: 'Armored Vanguard', strength_mult: 1.35, description: 'Lead units absorb initial defense fire', counter: 'defensive_turret' },
  { id: 'stealth', label: 'Stealth Approach', strength_mult: 1.1, description: 'Defenders get less warning time', counter: 'comms_tower' },
  { id: 'berserk', label: 'Berserk Frenzy', strength_mult: 1.45, description: 'Reckless but devastating charge', counter: 'armory' },
  { id: 'corrosive', label: 'Corrosive Payload', strength_mult: 1.25, description: 'Acid and breaching compounds eat fortifications', counter: 'workshop' },
];

const ROWS = ['A', 'B', 'C', 'D', 'E'];
const COLS = [1, 2, 3, 4, 5];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getAdjacentSectors = (sector: string) => {
  if (!sector) return [];
  const [rowStr, colStr] = sector.split('-');
  const row = ROWS.indexOf(rowStr);
  const col = Number(colStr) - 1;
  if (row < 0 || col < 0) return [];
  const sectors = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (nextRow >= 0 && nextRow < ROWS.length && nextCol >= 0 && nextCol < COLS.length) {
        sectors.push(`${ROWS[nextRow]}-${COLS[nextCol + 1]}`);
      }
    }
  }
  return sectors;
};

const calcEnvironmentalMultiplier = (archetype: any, world: any) => {
  const weather = String(world?.weather || 'overcast');
  const season = String(world?.season || 'autumn');
  const daylight = String(world?.daylight_phase || 'dusk');

  let multiplier = 1;
  if (archetype.strengths.includes(weather)) multiplier += 0.2;
  if (archetype.weaknesses.includes(weather)) multiplier -= 0.2;
  if (archetype.season_bonus?.[season]) multiplier += Number(archetype.season_bonus[season] || 0);
  if (['night', 'midnight'].includes(daylight)) multiplier += 0.15;
  if (['dawn', 'dusk'].includes(daylight)) multiplier += 0.08;
  return clamp(multiplier, 0.5, 2.25);
};

const calcSkillDefenseBonus = (defenders: any[]) => Math.round(defenders.reduce((total, defender) => {
  const skills = defender?.skills || {};
  return total
    + getSkillLevel(Number(skills.combat || 0)) * 1.5
    + getSkillLevel(Number(skills.survival || 0)) * 0.5
    + (getSkillLevel(Number(skills.leadership || 0)) >= 3 ? 2 : 0);
}, 0));

const calcModuleDefenseBonus = (modules: any[]) => Math.round(modules.reduce((total, module) => {
  const level = Number(module?.level || 1);
  if (module?.status !== 'active') return total;
  switch (module?.module_type) {
    case 'defensive_turret':
      return total + 3 * level;
    case 'watchtower':
      return total + 2 * level;
    case 'armory':
      return total + 1.5 * level;
    case 'comms_tower':
      return total + 1 * level;
    default:
      return total;
  }
}, 0));

const buildSectorProfile = (territory: any, bases: any[], modules: any[], survivors: any[]) => {
  const sectorBases = bases.filter((base) => base.sector === territory.sector && base.status === 'active');
  const sectorModules = modules.filter((module) => sectorBases.some((base) => base.id === module.base_id) && module.status === 'active');
  const defenders = survivors.filter((survivor) => {
    if (!['defend', 'patrol'].includes(String(survivor.current_task || ''))) return false;
    return sectorBases.some((base) => base.id === survivor.base_id);
  });

  const moduleTypes = Object.fromEntries(
    sectorModules.reduce((map, module) => {
      map.set(module.module_type, Number(map.get(module.module_type) || 0) + 1);
      return map;
    }, new Map<string, number>()),
  );

  return {
    territory,
    bases: sectorBases,
    modules: sectorModules,
    defenders,
    vulnerability_score: Math.max(0, 100
      - Number(territory.defense_power || 0) * 3
      - defenders.length * 8
      - sectorModules.length * 5
      - sectorBases.reduce((sum, base) => sum + Number(base.defense_level || 1), 0) * 4),
    countered_modifiers: SPECIAL_MODIFIERS
      .filter((modifier) => sectorModules.some((module) => module.module_type === modifier.counter))
      .map((modifier) => modifier.id),
  };
};

const classifyDefenseDistribution = (profiles: any[]) => {
  const scores = profiles.map((profile) => Number(profile.territory.defense_power || 0));
  const avg = scores.reduce((sum, value) => sum + value, 0) / (scores.length || 1);
  const variance = scores.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (scores.length || 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev < 3) return { label: 'even', average: avg, stdDev };
  if (stdDev < 8) return { label: 'moderate_gaps', average: avg, stdDev };
  return { label: 'highly_uneven', average: avg, stdDev };
};

const buildScaling = (profiles: any[], world: any, colony: any, cycleKey: string) => {
  const defenseStats = classifyDefenseDistribution(profiles);
  const preferredArchetype = [...WAVE_ARCHETYPES]
    .map((archetype) => ({ archetype, score: calcEnvironmentalMultiplier(archetype, world) }))
    .sort((left, right) => right.score - left.score)[0]?.archetype || WAVE_ARCHETYPES[0];
  const vulnerable = [...profiles].sort((left, right) => right.vulnerability_score - left.vulnerability_score);
  const targetCount = clamp(
    defenseStats.label === 'highly_uneven' ? 3 : defenseStats.label === 'moderate_gaps' ? 2 : 1,
    1,
    Math.min(5, profiles.length || 1),
  );
  const intensity = clamp(
    0.8 + (Number(defenseStats.average || 0) / 40) + ((100 - Number(colony?.morale ?? 50)) / 200),
    0.8,
    2.2,
  );
  const useModifiers = vulnerable.some((profile) => profile.modules.length > 0 || profile.defenders.length === 0);
  const preferredModifiers = SPECIAL_MODIFIERS
    .filter((modifier) => vulnerable.some((profile) => !profile.countered_modifiers.includes(modifier.id)))
    .slice(0, 2)
    .map((modifier) => modifier.id);

  return {
    intensity,
    target_count: targetCount,
    use_modifiers: useModifiers,
    preferred_behavior: preferredArchetype.behavior,
    preferred_archetype: preferredArchetype.type,
    preferred_modifiers: preferredModifiers,
    target_sectors: vulnerable.slice(0, targetCount).map((profile) => profile.territory.sector),
    defense_distribution: defenseStats.label,
    environmental_narrative: `${String(world?.weather || 'Weather conditions')} favor ${preferredArchetype.type} pressure against weak sectors.`,
    weather_shift: `Season ${String(world?.season || 'unknown')} keeps the front unstable.`,
    narrative: `Threat planners are leaning on ${preferredArchetype.type} behavior to exploit ${defenseStats.label.replace(/_/g, ' ')} defenses.`,
    escalation: `Average defense ${defenseStats.average.toFixed(1)} with ${defenseStats.stdDev.toFixed(1)} variance. Vulnerable sectors are being prioritized this cycle.`,
    vulnerable_profiles: vulnerable,
  };
};

const buildWaveNarrative = ({ held, wave, territory, effectiveDefense, modifierMitigated, baseDamage }: any) => {
  const modifierSummary = Array.isArray(wave?.modifiers) && wave.modifiers.length > 0
    ? ` Enemy modifiers: ${wave.modifiers.map((modifier: any) => modifier.label).join(', ')}.`
    : '';
  const baseSummary = baseDamage ? ` ${baseDamage.base_name} absorbed structural damage.` : '';
  const mitigationSummary = modifierMitigated ? ' Defensive modules blunted the enemy approach.' : '';
  if (held) {
    return `${wave.threat_name} hit sector ${territory.sector} but the line held at effective defense ${effectiveDefense} against strength ${wave.strength}.${modifierSummary}${mitigationSummary}${baseSummary}`.replace(/\s+/g, ' ').trim();
  }
  return `${wave.threat_name} breached sector ${territory.sector} after overwhelming effective defense ${effectiveDefense} with strength ${wave.strength}.${modifierSummary}${mitigationSummary}${baseSummary}`.replace(/\s+/g, ' ').trim();
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action = 'generate', territory_id, force = false } = await req.json().catch(() => ({}));
    const cycleKey = getCycleKey(180);
    const cycleSourceRef = buildSourceRef('ThreatWaveCycle', cycleKey);

    if (action === 'generate') {
      const [territories, bases, allModules, allSurvivors, world, colony] = await Promise.all([
        base44.asServiceRole.entities.Territory.filter({}),
        base44.asServiceRole.entities.PlayerBase.filter({}),
        base44.asServiceRole.entities.BaseModule.filter({}),
        base44.asServiceRole.entities.Survivor.filter({ status: 'active' }),
        base44.asServiceRole.entities.WorldConditions.list('-updated_date', 1).then((rows: any[]) => rows[0] || {}),
        base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1).then((rows: any[]) => rows[0] || null),
      ]);

      const activeBases = bases.filter((base) => base.status === 'active');
      const eligibleProfiles = territories
        .filter((territory) => territory.status !== 'uncharted' && territory?.active_threat_wave?.status !== 'incoming')
        .map((territory) => buildSectorProfile(territory, activeBases, allModules, allSurvivors));

      if (eligibleProfiles.length === 0) {
        return Response.json({
          status: 'ok',
          waves_generated: 0,
          waves: [],
          ai_scaling: {
            intensity: 1,
            target_count: 0,
            use_modifiers: false,
            preferred_behavior: 'none',
            preferred_archetype: 'none',
            preferred_modifiers: [],
            target_sectors: [],
            defense_distribution: 'stable',
            environmental_narrative: 'No eligible sectors for threat generation.',
            weather_shift: null,
            narrative: 'Threat simulation skipped.',
            escalation: 'All sectors already have incoming waves or are unavailable.',
          },
        });
      }

      const scaling = buildScaling(eligibleProfiles, world, colony, cycleKey);
      const generated = [];

      for (const profile of scaling.vulnerable_profiles.slice(0, scaling.target_count)) {
        const territory = profile.territory;
        if (!force && !deterministicBoolean(0.75, 'threat-wave-generate', cycleKey, territory.id, territory.threat_level)) {
          continue;
        }

        const archetype = WAVE_ARCHETYPES.find((entry) => entry.type === scaling.preferred_archetype) || WAVE_ARCHETYPES[0];
        const envMultiplier = calcEnvironmentalMultiplier(archetype, world);
        const basePower = { minimal: 4, low: 8, moderate: 14, high: 22, critical: 35 }[String(territory.threat_level || 'moderate')] || 12;
        const defenseAdaptation = Math.max(1, Number(territory.defense_power || 0) * 0.5 + profile.modules.length * 1.5);
        let strength = Math.round((basePower + defenseAdaptation * 0.5 + deterministicNumber(0, basePower, cycleKey, territory.id, 'strength')) * scaling.intensity * envMultiplier);

        const modifiers = [];
        if (scaling.use_modifiers) {
          const selectedModifierId = scaling.preferred_modifiers.find((id) => !profile.countered_modifiers.includes(id));
          const selectedModifier = SPECIAL_MODIFIERS.find((modifier) => modifier.id === selectedModifierId)
            || pickDeterministic(SPECIAL_MODIFIERS.filter((modifier) => !profile.countered_modifiers.includes(modifier.id)), cycleKey, territory.id, 'modifier');
          if (selectedModifier) {
            modifiers.push({
              id: selectedModifier.id,
              label: selectedModifier.label,
              description: selectedModifier.description,
            });
            strength = Math.round(strength * selectedModifier.strength_mult);
          }
        }

        const sectorBases = activeBases.filter((base) => base.sector === territory.sector);
        const targetedBase = ['targeted', 'siege'].includes(archetype.behavior)
          ? [...sectorBases].sort((left, right) => Number(left.defense_level || 1) - Number(right.defense_level || 1))[0]
          : null;

        let splitTarget = null;
        if (archetype.can_split && strength > 20) {
          splitTarget = territories
            .filter((candidate) => getAdjacentSectors(territory.sector).includes(candidate.sector) && candidate?.active_threat_wave?.status !== 'incoming')
            .sort((left, right) => Number(right.defense_power || 0) - Number(left.defense_power || 0))[0] || null;
        }

        const waveId = `wave_${cycleKey}_${territory.id}`;
        const sourceRefs = [
          cycleSourceRef,
          buildSourceRef('Territory', territory.id, 'incoming_wave'),
        ].filter(Boolean);

        const wave = withProvenance({
          wave_id: waveId,
          threat_name: pickDeterministic(archetype.names, cycleKey, territory.id, 'name') || archetype.names[0],
          strength,
          type: archetype.type,
          behavior: archetype.behavior,
          arriving_at: new Date(Date.now() + deterministicNumber(2, 8, cycleKey, territory.id, 'arrival') * 60 * 60 * 1000).toISOString(),
          status: 'incoming',
          modifiers,
          environmental_factor: {
            weather: world.weather,
            season: world.season,
            daylight: world.daylight_phase,
            multiplier: envMultiplier,
            narrative: scaling.environmental_narrative,
            weather_shift: scaling.weather_shift,
          },
          targeted_base_id: targetedBase?.id || null,
          targeted_base_name: targetedBase?.name || null,
          split_wave_sector: splitTarget?.sector || null,
          ai_scaling: {
            intensity: scaling.intensity,
            narrative_theme: scaling.narrative,
            escalation_note: scaling.escalation,
            defense_distribution: scaling.defense_distribution,
            sector_vulnerability: profile.vulnerability_score,
          },
        }, {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs,
        });

        await base44.asServiceRole.entities.Territory.update(
          territory.id,
          withProvenance(
            { active_threat_wave: wave },
            {
              dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
              sourceRefs,
            },
          ),
        );

        if (splitTarget) {
          const splitWave = withProvenance({
            ...wave,
            wave_id: `${waveId}_split`,
            threat_name: `${wave.threat_name} (Splinter)`,
            strength: Math.round(strength * 0.45),
            behavior: 'swarm',
            targeted_base_id: null,
            targeted_base_name: null,
            split_wave_sector: null,
          }, {
            dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
            sourceRefs: sourceRefs.concat(buildSourceRef('Territory', splitTarget.id, 'split_wave')),
          });

          await base44.asServiceRole.entities.Territory.update(
            splitTarget.id,
            withProvenance(
              { active_threat_wave: splitWave },
              {
                dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
                sourceRefs: sourceRefs.concat(buildSourceRef('Territory', splitTarget.id, 'split_wave')),
              },
            ),
          );
          generated.push({ sector: splitTarget.sector, wave: splitWave, is_split: true });
        }

        await base44.asServiceRole.entities.Notification.create(withProvenance({
          player_email: 'broadcast',
          title: `⚠ ${wave.threat_name}${modifiers.length > 0 ? ` [${modifiers[0].label}]` : ''}`,
          message: `STR ${strength} inbound to sector ${territory.sector}${targetedBase ? ` targeting ${targetedBase.name}` : ''}. Env: ${world.weather} ×${envMultiplier.toFixed(2)}. ${scaling.narrative}`,
          type: 'colony_alert',
          priority: strength > 25 ? 'critical' : 'normal',
        }, {
          dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
          sourceRefs,
        }));

        generated.push({ sector: territory.sector, wave, is_split: false });
      }

      return Response.json({
        status: 'ok',
        waves_generated: generated.length,
        waves: generated,
        ai_scaling: {
          intensity: scaling.intensity,
          target_count: scaling.target_count,
          use_modifiers: scaling.use_modifiers,
          preferred_behavior: scaling.preferred_behavior,
          preferred_archetype: scaling.preferred_archetype,
          preferred_modifiers: scaling.preferred_modifiers,
          target_sectors: scaling.target_sectors,
          defense_distribution: scaling.defense_distribution,
          environmental_narrative: scaling.environmental_narrative,
          weather_shift: scaling.weather_shift,
          narrative: scaling.narrative,
          escalation: scaling.escalation,
        },
      });
    }

    if (action === 'resolve' || action === 'resolve_all') {
      const [territories, bases, allModules, allSurvivors, colony] = await Promise.all([
        base44.asServiceRole.entities.Territory.filter({}),
        base44.asServiceRole.entities.PlayerBase.filter({}),
        base44.asServiceRole.entities.BaseModule.filter({}),
        base44.asServiceRole.entities.Survivor.filter({ status: 'active' }),
        base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1).then((rows: any[]) => rows[0] || null),
      ]);

      const targets = territory_id
        ? territories.filter((territory) => territory.id === territory_id)
        : territories.filter((territory) => territory?.active_threat_wave?.status === 'incoming');

      const results = [];
      let totalMoraleDamage = 0;

      for (const territory of targets) {
        const wave = territory.active_threat_wave;
        if (!wave || wave.status !== 'incoming') {
          continue;
        }

        const archetype = WAVE_ARCHETYPES.find((entry) => entry.type === wave.type) || WAVE_ARCHETYPES[0];
        const sectorBases = bases.filter((base) => base.sector === territory.sector && base.status === 'active');
        const sectorModules = allModules.filter((module) => sectorBases.some((base) => base.id === module.base_id) && module.status === 'active');
        const sectorDefenders = allSurvivors.filter((survivor) => ['defend', 'patrol'].includes(String(survivor.current_task || '')) && sectorBases.some((base) => base.id === survivor.base_id));

        const skillBonus = calcSkillDefenseBonus(sectorDefenders);
        const moduleBonus = calcModuleDefenseBonus(sectorModules);
        let effectiveDefense = Number(territory.defense_power || 0) + skillBonus + moduleBonus;
        let modifierMitigated = false;

        for (const modifier of wave.modifiers || []) {
          const fullModifier = SPECIAL_MODIFIERS.find((entry) => entry.id === modifier.id);
          if (!fullModifier) continue;
          if (sectorModules.some((module) => module.module_type === fullModifier.counter && module.status === 'active')) {
            modifierMitigated = true;
            effectiveDefense = Math.round(effectiveDefense * 1.1);
          } else {
            effectiveDefense = Math.round(effectiveDefense * 0.92);
          }
        }

        const held = effectiveDefense >= Number(wave.strength || 0);
        const margin = effectiveDefense - Number(wave.strength || 0);
        const marginPct = Number(wave.strength || 0) > 0 ? Math.round((margin / Number(wave.strength || 1)) * 100) : 100;

        let influenceDelta = 0;
        let newStatus = territory.status;
        let defenseReduction = 0;
        let defenderLosses = 0;
        let baseDamage = null;

        if (held) {
          influenceDelta = marginPct > 50 ? 10 : marginPct > 20 ? 5 : 2;
          defenseReduction = marginPct > 20 ? 0 : Math.ceil(Number(wave.strength || 0) * 0.1);
        } else {
          influenceDelta = margin < -20 ? -30 : margin < -10 ? -18 : -10;
          defenseReduction = Math.ceil(Number(wave.strength || 0) * (margin < -20 ? 0.5 : 0.3));
          defenderLosses = margin < -20 ? 2 : 1;
          if (territory.status === 'secured') newStatus = 'contested';
          if (margin < -20 && territory.status === 'contested') newStatus = 'hostile';
          totalMoraleDamage += Number(archetype.base_morale_damage || 0);

          if (wave.targeted_base_id) {
            const targetBase = bases.find((base) => base.id === wave.targeted_base_id);
            if (targetBase) {
              const newDefense = Math.max(0, Number(targetBase.defense_level || 1) - (margin < -20 ? 2 : 1));
              const newBaseStatus = newDefense === 0 ? 'under_siege' : targetBase.status;
              await base44.asServiceRole.entities.PlayerBase.update(
                targetBase.id,
                withProvenance(
                  { defense_level: newDefense, status: newBaseStatus },
                  {
                    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
                    sourceRefs: [buildSourceRef('Territory', territory.id, 'wave_resolution'), cycleSourceRef],
                  },
                ),
              );
              baseDamage = { base_name: targetBase.name, new_defense: newDefense, new_status: newBaseStatus };
            }
          }
        }

        const xpRewards = [];
        for (const defender of sectorDefenders) {
          const combatXp = held ? (marginPct < 10 ? 25 : 15) : 8;
          const survivalXp = held ? 5 : 8;
          const leadershipXp = sectorDefenders.length > 2 ? 3 : 0;

          const skills = { ...(defender.skills || {}) };
          skills.combat = Number(skills.combat || 0) + combatXp;
          skills.survival = Number(skills.survival || 0) + survivalXp;
          if (leadershipXp > 0) {
            skills.leadership = Number(skills.leadership || 0) + leadershipXp;
          }

          const updates: Record<string, unknown> = {
            skills,
            skill_log: [
              { skill: 'combat', xp: combatXp, reason: `${held ? 'Defended' : 'Fought'} ${wave.threat_name} at ${territory.sector}`, date: new Date().toISOString() },
              { skill: 'survival', xp: survivalXp, reason: `Survived ${wave.threat_name} at ${territory.sector}`, date: new Date().toISOString() },
              ...(leadershipXp > 0 ? [{ skill: 'leadership', xp: leadershipXp, reason: `Led defense at ${territory.sector}`, date: new Date().toISOString() }] : []),
              ...(defender.skill_log || []),
            ].slice(0, 20),
            combat_rating: computeCombatRating(skills.combat || 0),
          };

          if (!held && defenderLosses > 0 && sectorDefenders.indexOf(defender) < defenderLosses) {
            updates.health = 'injured';
            updates.current_task = 'idle';
          }

          await base44.asServiceRole.entities.Survivor.update(
            defender.id,
            withProvenance(
              updates as any,
              {
                dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
                sourceRefs: [buildSourceRef('Territory', territory.id, 'wave_resolution'), cycleSourceRef],
              },
            ),
          );

          xpRewards.push({
            name: defender.nickname || defender.name,
            combat: combatXp,
            survival: survivalXp,
          });
        }

        const resultNarrative = buildWaveNarrative({
          held,
          wave,
          territory,
          effectiveDefense,
          modifierMitigated,
          baseDamage,
        });

        await base44.asServiceRole.entities.Territory.update(
          territory.id,
          withProvenance(
            {
              active_threat_wave: withProvenance({ ...wave, status: 'resolved' }, {
                dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
                sourceRefs: [buildSourceRef('Territory', territory.id, 'wave_resolved'), cycleSourceRef],
              }),
              last_wave_result: resultNarrative,
              influence_level: clamp(Number(territory.influence_level || 0) + influenceDelta, 0, 100),
              status: newStatus,
              defense_power: Math.max(0, Number(territory.defense_power || 0) - defenseReduction),
              defender_count: Math.max(0, Number(territory.defender_count || 0) - defenderLosses),
            },
            {
              dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
              sourceRefs: [buildSourceRef('Territory', territory.id, 'wave_resolution'), cycleSourceRef],
            },
          ),
        );

        await base44.asServiceRole.entities.OpsLog.create(withProvenance({
          event_type: 'combat_raid',
          title: held ? `${wave.threat_name} repelled at ${territory.sector}` : `${territory.sector} breached by ${wave.threat_name}`,
          detail: resultNarrative,
          severity: held ? 'notable' : 'critical',
          sector: territory.sector,
          source: 'automation',
        }, {
          dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
          sourceRefs: [buildSourceRef('Territory', territory.id, 'wave_resolution'), cycleSourceRef],
        }));

        results.push({
          sector: territory.sector,
          held,
          margin,
          effective_defense: effectiveDefense,
          skill_bonus: skillBonus,
          module_bonus: moduleBonus,
          modifier_mitigated: modifierMitigated,
          defenders: sectorDefenders.length,
          wave_strength: wave.strength,
          modifiers: (wave.modifiers || []).map((modifier: any) => modifier.label),
          base_damage: baseDamage,
          defender_losses: defenderLosses,
          influence_change: influenceDelta,
          xp_rewards: xpRewards,
          result: resultNarrative,
        });
      }

      if (colony && totalMoraleDamage > 0) {
        await base44.asServiceRole.entities.ColonyStatus.update(
          colony.id,
          withProvenance(
            { morale: Math.max(0, Number(colony.morale ?? 50) - totalMoraleDamage) },
            {
              dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
              sourceRefs: [cycleSourceRef, buildSourceRef('ColonyStatus', colony.id, 'threat_wave')],
            },
          ),
        );
      }

      return Response.json({ status: 'ok', resolved: results.length, results, morale_damage: totalMoraleDamage });
    }

    return Response.json({ error: "Unknown action. Use 'generate', 'resolve', or 'resolve_all'" }, { status: 400 });
  } catch (error) {
    console.error('threatWaveEngine error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
});
