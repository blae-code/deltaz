import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * threatWaveEngine v3 — Complex threat wave simulation with:
 * - Splitting hordes, targeted attacks, environmental interactions
 * - AI-driven dynamic threat scaling
 * - Survivor skill-based defense bonuses and XP rewards on resolution
 */

const WAVE_ARCHETYPES = [
  {
    type: "horde",
    names: ["Zombie Horde", "Shambler Swarm", "Dead Tide", "Rotting Legion", "Corpse Flood"],
    behavior: "swarm",
    can_split: true,
    env_weakness: ["storm"],
    env_strength: ["fog", "night"],
    base_morale_damage: 5,
  },
  {
    type: "raiders",
    names: ["Raider War Party", "Bandit Assault", "Scavenger Gang", "Marauder Blitz", "Warlord Vanguard"],
    behavior: "targeted",
    can_split: false,
    env_weakness: ["rain", "blizzard"],
    env_strength: ["clear", "overcast"],
    base_morale_damage: 3,
  },
  {
    type: "mutants",
    names: ["Mutant Pack", "Irradiated Beasts", "Toxic Crawlers", "Abomination Swarm", "Glowing Stalkers"],
    behavior: "adaptive",
    can_split: true,
    env_weakness: ["clear"],
    env_strength: ["radiation_storm", "ashfall", "acid_rain"],
    base_morale_damage: 7,
  },
  {
    type: "storm",
    names: ["Radiation Storm", "Acid Rain Front", "Electromagnetic Pulse", "Toxic Miasma", "Ash Tempest"],
    behavior: "area",
    can_split: false,
    env_weakness: [],
    env_strength: ["radiation_storm", "dust_storm", "ashfall"],
    base_morale_damage: 4,
  },
  {
    type: "siege",
    names: ["Organized Siege Force", "Militia Assault Column", "Armored Convoy", "Fortification Breakers"],
    behavior: "siege",
    can_split: false,
    env_weakness: ["heavy_rain", "thunderstorm", "blizzard"],
    env_strength: ["clear", "overcast"],
    base_morale_damage: 10,
  },
];

const SPECIAL_MODIFIERS = [
  { id: "flanking", label: "Flanking Maneuver", strength_mult: 1.2, description: "Attack splits to hit from two directions" },
  { id: "armored", label: "Armored Vanguard", strength_mult: 1.4, description: "Lead units absorb initial defense fire" },
  { id: "stealth", label: "Stealth Approach", strength_mult: 1.1, description: "Defenders get less warning time" },
  { id: "berserk", label: "Berserk Frenzy", strength_mult: 1.5, description: "Reckless but devastating charge" },
  { id: "tactical", label: "Tactical Formation", strength_mult: 1.3, description: "Coordinated assault targeting weak points" },
  { id: "overwhelming", label: "Overwhelming Numbers", strength_mult: 1.6, description: "Sheer numbers threaten to overrun positions" },
];

const ROWS = ["A", "B", "C", "D", "E"];
const COLS = [1, 2, 3, 4, 5];
const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

function getSkillLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getAdjacentSectors(sector) {
  if (!sector) return [];
  const [rowStr, colStr] = sector.split("-");
  const row = ROWS.indexOf(rowStr);
  const col = parseInt(colStr) - 1;
  if (row < 0 || col < 0) return [];
  const adj = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < ROWS.length && nc >= 0 && nc < COLS.length) {
        adj.push(`${ROWS[nr]}-${COLS[nc + 1]}`);
      }
    }
  }
  return adj;
}

function calcEnvironmentalMultiplier(archetype, weather, season, daylight) {
  let mult = 1.0;
  if (archetype.env_strength.includes(weather)) mult += 0.25;
  if (archetype.env_weakness.includes(weather)) mult -= 0.25;
  if (daylight === "night" || daylight === "midnight" || daylight === "dusk") mult += 0.15;
  if (season === "nuclear_winter") mult += 0.2;
  if (season === "monsoon" && archetype.type === "raiders") mult -= 0.15;
  return Math.max(0.5, Math.min(2.0, mult));
}

// Calculate skill-based defense bonus from defenders
function calcSkillDefenseBonus(defenders) {
  let bonus = 0;
  for (const d of defenders) {
    const skills = d.skills || {};
    const combatLevel = getSkillLevel(skills.combat || 0);
    const survivalLevel = getSkillLevel(skills.survival || 0);
    const leadershipLevel = getSkillLevel(skills.leadership || 0);
    // Combat provides direct defense, survival adds awareness, leadership buffs the group
    bonus += combatLevel * 1.5 + survivalLevel * 0.5;
    if (leadershipLevel >= 3) bonus += 2; // Leadership bonus at level 3+
  }
  return Math.round(bonus);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action = "generate", territory_id, force = false } = await req.json().catch(() => ({}));

    // ─── GENERATE ───
    if (action === "generate") {
      const territories = await base44.asServiceRole.entities.Territory.filter({});
      const bases = await base44.asServiceRole.entities.PlayerBase.filter({});
      const activeBases = bases.filter(b => b.status === "active");
      const worldList = await base44.asServiceRole.entities.WorldConditions.list("-updated_date", 1);
      const world = worldList[0] || {};
      const colonyList = await base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1);
      const colony = colonyList[0];

      const totalDefense = territories.reduce((sum, t) => sum + (t.defense_power || 0), 0);
      const avgDefense = territories.length > 0 ? totalDefense / territories.length : 0;
      const maxDefense = Math.max(...territories.map(t => t.defense_power || 0), 1);
      const securedCount = territories.filter(t => t.status === "secured").length;
      const colonyMorale = colony?.morale ?? 50;

      let aiScaling;
      try {
        aiScaling = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a threat simulation AI for a post-apocalyptic survival game.

Current state:
- ${territories.length} territories, ${securedCount} secured
- ${activeBases.length} active player bases
- Average sector defense: ${avgDefense.toFixed(1)}, max: ${maxDefense}
- Colony morale: ${colonyMorale}%
- Weather: ${world.weather || "unknown"}, Season: ${world.season || "unknown"}, Time: ${world.daylight_phase || "unknown"}
- Active threat waves: ${territories.filter(t => t.active_threat_wave?.status === "incoming").length}

Determine threat scaling:
- intensity_multiplier: 0.5-2.5
- target_count: 1-5
- use_special_modifiers: true/false
- preferred_behavior: "swarm"|"targeted"|"adaptive"|"area"|"siege"|"random"
- narrative_theme: 1 sentence
- escalation_note: brief note`,
          response_json_schema: {
            type: "object",
            properties: {
              intensity_multiplier: { type: "number" },
              target_count: { type: "number" },
              use_special_modifiers: { type: "boolean" },
              preferred_behavior: { type: "string" },
              narrative_theme: { type: "string" },
              escalation_note: { type: "string" },
            },
          },
        });
      } catch {
        aiScaling = {
          intensity_multiplier: avgDefense > 15 ? 1.4 : avgDefense > 8 ? 1.0 : 0.7,
          target_count: Math.min(3, Math.max(1, Math.floor(territories.length * 0.3))),
          use_special_modifiers: avgDefense > 10,
          preferred_behavior: "random",
          narrative_theme: "The wasteland stirs with new threats.",
          escalation_note: "Automated scaling fallback.",
        };
      }

      const intensityMult = Math.max(0.5, Math.min(2.5, aiScaling.intensity_multiplier || 1.0));
      const targetCount = Math.max(1, Math.min(5, Math.round(aiScaling.target_count || 2)));
      const useModifiers = aiScaling.use_special_modifiers ?? false;
      const preferredBehavior = aiScaling.preferred_behavior || "random";

      const eligible = territories.filter(t =>
        t.status !== "uncharted" &&
        (!t.active_threat_wave || t.active_threat_wave.status !== "incoming")
      );

      const scored = eligible.map(t => {
        let score = { minimal: 5, low: 15, moderate: 30, high: 55, critical: 80 }[t.threat_level] || 10;
        if (activeBases.some(b => b.sector === t.sector)) score += 20;
        if ((t.influence_level || 0) > 50) score += 15;
        return { territory: t, score };
      }).sort((a, b) => b.score - a.score);

      const generated = [];
      const toTarget = force ? Math.min(scored.length, targetCount) : scored.length;

      for (let i = 0; i < toTarget && generated.length < targetCount; i++) {
        const { territory, score } = scored[i];
        const prob = Math.min(0.95, score / 100);
        if (!force && Math.random() > prob) continue;

        let archetype;
        if (preferredBehavior !== "random") {
          archetype = WAVE_ARCHETYPES.find(a => a.behavior === preferredBehavior) || pick(WAVE_ARCHETYPES);
        } else {
          archetype = pick(WAVE_ARCHETYPES);
        }

        const sectorBases = activeBases.filter(b => b.sector === territory.sector);
        const targetedBase = sectorBases.length > 0 && archetype.behavior === "targeted" ? pick(sectorBases) : null;
        const envMult = calcEnvironmentalMultiplier(archetype, world.weather, world.season, world.daylight_phase);
        const basePower = { minimal: 4, low: 8, moderate: 14, high: 22, critical: 35 }[territory.threat_level] || 12;
        const defenseAdaptation = Math.max(1, (territory.defense_power || 0) * 0.6);
        let strength = Math.round((basePower + defenseAdaptation * 0.5 + rand(0, basePower)) * intensityMult * envMult);

        const modifiers = [];
        if (useModifiers && Math.random() < 0.4) {
          const mod = pick(SPECIAL_MODIFIERS);
          modifiers.push(mod);
          strength = Math.round(strength * mod.strength_mult);
        }

        let splitTarget = null;
        if (archetype.can_split && strength > 20 && Math.random() < 0.35) {
          const adjacent = getAdjacentSectors(territory.sector);
          const adjacentTerritories = territories.filter(t => adjacent.includes(t.sector) && !t.active_threat_wave?.status);
          if (adjacentTerritories.length > 0) splitTarget = pick(adjacentTerritories);
        }

        const waveId = `wave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const wave = {
          wave_id: waveId,
          threat_name: pick(archetype.names),
          strength,
          type: archetype.type,
          behavior: archetype.behavior,
          arriving_at: new Date(Date.now() + rand(2, 8) * 60 * 60 * 1000).toISOString(),
          status: "incoming",
          modifiers: modifiers.map(m => ({ id: m.id, label: m.label, description: m.description })),
          environmental_factor: envMult !== 1.0 ? { weather: world.weather, season: world.season, multiplier: envMult } : null,
          targeted_base_id: targetedBase?.id || null,
          targeted_base_name: targetedBase?.name || null,
          split_wave_sector: splitTarget?.sector || null,
          ai_scaling: { intensity: intensityMult, narrative_theme: aiScaling.narrative_theme, escalation_note: aiScaling.escalation_note },
        };

        await base44.asServiceRole.entities.Territory.update(territory.id, { active_threat_wave: wave });

        if (splitTarget) {
          const splitStrength = Math.round(strength * 0.45);
          const splitWave = {
            wave_id: `${waveId}_split`, threat_name: `${wave.threat_name} (Splinter)`,
            strength: splitStrength, type: archetype.type, behavior: "swarm",
            arriving_at: wave.arriving_at, status: "incoming", modifiers: [],
            environmental_factor: wave.environmental_factor,
            targeted_base_id: null, targeted_base_name: null, split_wave_sector: null,
            ai_scaling: wave.ai_scaling,
          };
          await base44.asServiceRole.entities.Territory.update(splitTarget.id, { active_threat_wave: splitWave });
          generated.push({ sector: splitTarget.sector, wave: splitWave, is_split: true });
        }

        const modLabel = modifiers.length > 0 ? ` [${modifiers[0].label}]` : "";
        const baseLabel = targetedBase ? ` targeting ${targetedBase.name}` : "";
        const splitLabel = splitTarget ? ` (horde splitting to ${splitTarget.sector})` : "";
        await base44.asServiceRole.entities.Notification.create({
          player_email: "broadcast",
          title: `⚠ ${wave.threat_name}${modLabel}`,
          message: `STR ${strength} inbound to sector ${territory.sector}${baseLabel}${splitLabel}. Env factor: ×${envMult.toFixed(1)}. ${aiScaling.narrative_theme || ""}`,
          type: "colony_alert",
          priority: strength > 25 ? "critical" : "normal",
        });

        generated.push({ sector: territory.sector, wave, is_split: false });
      }

      return Response.json({
        status: "ok",
        waves_generated: generated.length,
        waves: generated,
        ai_scaling: { intensity: intensityMult, target_count: targetCount, use_modifiers: useModifiers, preferred_behavior: preferredBehavior, narrative: aiScaling.narrative_theme, escalation: aiScaling.escalation_note },
      });
    }

    // ─── RESOLVE ───
    if (action === "resolve" || action === "resolve_all") {
      const territories = await base44.asServiceRole.entities.Territory.filter({});
      const bases = await base44.asServiceRole.entities.PlayerBase.filter({});
      const allSurvivors = await base44.asServiceRole.entities.Survivor.filter({ status: "active" });
      const colonyList = await base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1);
      const colony = colonyList[0];

      const toResolve = territory_id
        ? territories.filter(t => t.id === territory_id)
        : territories.filter(t => t.active_threat_wave?.status === "incoming");

      const results = [];
      let totalMoraleDamage = 0;

      for (const t of toResolve) {
        const wave = t.active_threat_wave;
        if (!wave || wave.status !== "incoming") continue;

        const defense = t.defense_power || 0;
        const archetype = WAVE_ARCHETYPES.find(a => a.type === wave.type) || WAVE_ARCHETYPES[0];

        const hasArmored = (wave.modifiers || []).some(m => m.id === "armored");
        const hasFlanking = (wave.modifiers || []).some(m => m.id === "flanking");
        const hasStealth = (wave.modifiers || []).some(m => m.id === "stealth");

        let effectiveDefense = defense;
        if (hasArmored) effectiveDefense = Math.round(effectiveDefense * 0.8);
        if (hasFlanking) effectiveDefense = Math.round(effectiveDefense * 0.85);
        if (hasStealth) effectiveDefense = Math.round(effectiveDefense * 0.9);

        // ─── SKILL-BASED DEFENSE BONUS ───
        const sectorDefenders = allSurvivors.filter(s => {
          if (s.current_task !== "defend" && s.current_task !== "patrol") return false;
          const sBase = bases.find(b => b.id === s.base_id);
          return sBase?.sector === t.sector;
        });
        const skillBonus = calcSkillDefenseBonus(sectorDefenders);
        effectiveDefense += skillBonus;

        const held = effectiveDefense >= wave.strength;
        const margin = effectiveDefense - wave.strength;
        const marginPct = wave.strength > 0 ? Math.round((margin / wave.strength) * 100) : 100;

        let influenceDelta = 0;
        let newStatus = t.status;
        let defenseReduction = 0;
        let defenderLosses = 0;
        let baseDamage = null;

        if (held) {
          if (marginPct > 50) influenceDelta = 10;
          else if (marginPct > 20) influenceDelta = 5;
          else {
            influenceDelta = 2;
            defenseReduction = Math.ceil(wave.strength * 0.1);
          }
        } else {
          const severity = margin < -20 ? "devastated" : margin < -10 ? "overrun" : "breached";
          influenceDelta = severity === "devastated" ? -30 : severity === "overrun" ? -18 : -10;
          defenseReduction = Math.ceil(wave.strength * (severity === "devastated" ? 0.5 : 0.3));
          defenderLosses = severity === "devastated" ? 2 : 1;
          if (t.status === "secured") newStatus = "contested";
          if (severity === "devastated" && t.status === "contested") newStatus = "hostile";
          totalMoraleDamage += archetype.base_morale_damage;

          if (wave.targeted_base_id) {
            const targetBase = bases.find(b => b.id === wave.targeted_base_id);
            if (targetBase) {
              const newDefLevel = Math.max(0, (targetBase.defense_level || 1) - (severity === "devastated" ? 2 : 1));
              const newBaseStatus = newDefLevel === 0 ? "under_siege" : targetBase.status;
              await base44.asServiceRole.entities.PlayerBase.update(targetBase.id, { defense_level: newDefLevel, status: newBaseStatus });
              baseDamage = { base_name: targetBase.name, new_defense: newDefLevel, new_status: newBaseStatus };
            }
          }
        }

        // Update territory
        const newInfluence = Math.max(0, Math.min(100, (t.influence_level || 0) + influenceDelta));
        const newDefense = Math.max(0, (t.defense_power || 0) - defenseReduction);
        const newDefenders = Math.max(0, (t.defender_count || 0) - defenderLosses);

        // ─── AWARD COMBAT XP TO DEFENDERS ───
        const xpRewards = [];
        for (const defender of sectorDefenders) {
          const baseXp = held ? 15 : 8; // More XP for winning
          const criticalBonus = marginPct < 10 && held ? 10 : 0; // Clutch defense bonus
          const combatXp = baseXp + criticalBonus;
          const survivalXp = held ? 5 : 8; // More survival XP from losing (learned from hardship)
          const leadershipXp = sectorDefenders.length > 2 ? 3 : 0; // Group defense leadership

          const skills = { ...(defender.skills || {}) };
          skills.combat = (skills.combat || 0) + combatXp;
          skills.survival = (skills.survival || 0) + survivalXp;
          if (leadershipXp > 0) skills.leadership = (skills.leadership || 0) + leadershipXp;

          const skillLog = [...(defender.skill_log || [])].slice(0, 17);
          skillLog.unshift({ skill: 'combat', xp: combatXp, reason: `${held ? 'Defended' : 'Fought'} ${wave.threat_name} at ${t.sector}`, date: new Date().toISOString() });
          skillLog.unshift({ skill: 'survival', xp: survivalXp, reason: `Survived ${wave.threat_name} at ${t.sector}`, date: new Date().toISOString() });
          if (leadershipXp > 0) {
            skillLog.unshift({ skill: 'leadership', xp: leadershipXp, reason: `Led defense at ${t.sector}`, date: new Date().toISOString() });
          }

          const updates = { skills, skill_log: skillLog.slice(0, 20) };
          updates.combat_rating = Math.min(10, getSkillLevel(skills.combat || 0) + Math.floor((skills.combat || 0) / 200));

          // Also handle injury for lost defenders
          if (!held && defenderLosses > 0 && sectorDefenders.indexOf(defender) < defenderLosses) {
            updates.health = "injured";
            updates.current_task = "idle";
          }

          await base44.asServiceRole.entities.Survivor.update(defender.id, updates);
          xpRewards.push({ name: defender.nickname || defender.name, combat: combatXp, survival: survivalXp });
        }

        // Generate narrative
        let resultNarrative;
        try {
          const modDesc = (wave.modifiers || []).map(m => m.label).join(", ");
          resultNarrative = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Write a 2-sentence post-apocalyptic battle report. ${wave.threat_name} (STR ${wave.strength}${modDesc ? `, ${modDesc}` : ""}) attacked sector ${t.sector}. Defense: ${effectiveDefense} (base ${defense} + ${skillBonus} skill bonus from ${sectorDefenders.length} defenders). ${held ? `Defense held${marginPct > 50 ? " decisively" : marginPct < 10 ? " barely" : ""}.` : `Defenses ${margin < -20 ? "were devastated" : margin < -10 ? "were overrun" : "were breached"}.`}${baseDamage ? ` Base "${baseDamage.base_name}" took direct damage.` : ""} Environmental: ${wave.environmental_factor ? `${wave.environmental_factor.weather} (×${wave.environmental_factor.multiplier})` : "normal"}. Mention the skilled defenders.`,
          });
        } catch {
          resultNarrative = held
            ? `Defense held against ${wave.threat_name} at sector ${t.sector} (DEF ${effectiveDefense} vs STR ${wave.strength}). Skilled defenders provided +${skillBonus} bonus.`
            : `${wave.threat_name} breached sector ${t.sector} defenses (DEF ${effectiveDefense} vs STR ${wave.strength}). Despite +${skillBonus} skill bonus, the wave overwhelmed positions.`;
        }

        await base44.asServiceRole.entities.Territory.update(t.id, {
          active_threat_wave: { ...wave, status: "resolved" },
          last_wave_result: typeof resultNarrative === 'string' ? resultNarrative : JSON.stringify(resultNarrative),
          influence_level: newInfluence,
          status: newStatus,
          defense_power: newDefense,
          defender_count: newDefenders,
        });

        await base44.asServiceRole.entities.OpsLog.create({
          event_type: "combat_raid",
          title: held ? `${wave.threat_name} repelled at ${t.sector}` : `${t.sector} ${margin < -20 ? "devastated" : "breached"} by ${wave.threat_name}`,
          detail: typeof resultNarrative === 'string' ? resultNarrative : JSON.stringify(resultNarrative),
          severity: held ? "notable" : "critical",
          sector: t.sector,
          source: "automation",
        });

        results.push({
          sector: t.sector,
          held,
          margin,
          effective_defense: effectiveDefense,
          skill_bonus: skillBonus,
          defenders: sectorDefenders.length,
          wave_strength: wave.strength,
          modifiers: (wave.modifiers || []).map(m => m.label),
          base_damage: baseDamage,
          defender_losses: defenderLosses,
          influence_change: influenceDelta,
          xp_rewards: xpRewards,
          result: typeof resultNarrative === 'string' ? resultNarrative : JSON.stringify(resultNarrative),
        });
      }

      if (colony && totalMoraleDamage > 0) {
        const newMorale = Math.max(0, (colony.morale ?? 50) - totalMoraleDamage);
        await base44.asServiceRole.entities.ColonyStatus.update(colony.id, { morale: newMorale });
      }

      return Response.json({ status: "ok", resolved: results.length, results, morale_damage: totalMoraleDamage });
    }

    return Response.json({ error: "Unknown action. Use 'generate', 'resolve', or 'resolve_all'" }, { status: 400 });
  } catch (error) {
    console.error("threatWaveEngine v3 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});