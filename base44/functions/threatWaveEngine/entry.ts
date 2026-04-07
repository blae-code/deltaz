import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * threatWaveEngine v2 — Complex threat wave simulation with:
 * - Splitting hordes that spread to adjacent sectors
 * - Targeted attacks on specific player bases
 * - Environmental interactions (weather/season amplifiers)
 * - AI-driven dynamic threat scaling based on player defense levels
 * - Multi-phase wave progression
 * 
 * Actions:
 *   { action: "generate" }                — AI-scaled wave generation
 *   { action: "generate", force: true }   — bypass probability checks
 *   { action: "resolve", territory_id }   — resolve one wave
 *   { action: "resolve_all" }             — resolve all incoming waves
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

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

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

      // Get world conditions for environmental interactions
      const worldList = await base44.asServiceRole.entities.WorldConditions.list("-updated_date", 1);
      const world = worldList[0] || {};

      // Get colony for morale-linked intensity
      const colonyList = await base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1);
      const colony = colonyList[0];

      // ── AI Dynamic Scaling ──
      // Analyze player defense posture to scale threats appropriately
      const totalDefense = territories.reduce((sum, t) => sum + (t.defense_power || 0), 0);
      const avgDefense = territories.length > 0 ? totalDefense / territories.length : 0;
      const maxDefense = Math.max(...territories.map(t => t.defense_power || 0), 1);
      const securedCount = territories.filter(t => t.status === "secured").length;
      const colonyMorale = colony?.morale ?? 50;

      // AI prompt for dynamic threat scaling
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

Based on this, determine threat scaling for next wave generation:
- intensity_multiplier: 0.5-2.5 (how strong waves should be relative to defense)
- target_count: 1-5 (how many sectors to target)
- use_special_modifiers: true/false (should waves have special abilities)
- preferred_behavior: "swarm"|"targeted"|"adaptive"|"area"|"siege"|"random"
- narrative_theme: a short 1-sentence theme for this wave cycle
- escalation_note: brief tactical note about why this intensity

Make it challenging but fair. If defenses are low, don't obliterate them — threaten them. If defenses are high, escalate dramatically.`,
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
        // Fallback scaling
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

      // Filter eligible targets
      const eligible = territories.filter(t =>
        t.status !== "uncharted" &&
        (!t.active_threat_wave || t.active_threat_wave.status !== "incoming")
      );

      // Score and sort by priority (higher defense = more likely targeted for challenge)
      const scored = eligible.map(t => {
        let score = { minimal: 5, low: 15, moderate: 30, high: 55, critical: 80 }[t.threat_level] || 10;
        // Prefer sectors with bases (targeted attacks)
        if (activeBases.some(b => b.sector === t.sector)) score += 20;
        // Prefer high-influence sectors
        if ((t.influence_level || 0) > 50) score += 15;
        return { territory: t, score };
      }).sort((a, b) => b.score - a.score);

      const generated = [];
      const toTarget = force ? Math.min(scored.length, targetCount) : scored.length;

      for (let i = 0; i < toTarget && generated.length < targetCount; i++) {
        const { territory, score } = scored[i];

        // Probability check (skip if not forced)
        const prob = Math.min(0.95, score / 100);
        if (!force && Math.random() > prob) continue;

        // Pick archetype
        let archetype;
        if (preferredBehavior !== "random") {
          archetype = WAVE_ARCHETYPES.find(a => a.behavior === preferredBehavior) || pick(WAVE_ARCHETYPES);
        } else {
          archetype = pick(WAVE_ARCHETYPES);
        }

        // Targeted attacks on bases
        const sectorBases = activeBases.filter(b => b.sector === territory.sector);
        const targetedBase = sectorBases.length > 0 && archetype.behavior === "targeted"
          ? pick(sectorBases) : null;

        // Environmental multiplier
        const envMult = calcEnvironmentalMultiplier(archetype, world.weather, world.season, world.daylight_phase);

        // Base strength calculation with AI scaling
        const basePower = { minimal: 4, low: 8, moderate: 14, high: 22, critical: 35 }[territory.threat_level] || 12;
        const defenseAdaptation = Math.max(1, (territory.defense_power || 0) * 0.6);
        let strength = Math.round((basePower + defenseAdaptation * 0.5 + rand(0, basePower)) * intensityMult * envMult);

        // Special modifiers
        const modifiers = [];
        if (useModifiers && Math.random() < 0.4) {
          const mod = pick(SPECIAL_MODIFIERS);
          modifiers.push(mod);
          strength = Math.round(strength * mod.strength_mult);
        }

        // Splitting horde behavior
        let splitTarget = null;
        if (archetype.can_split && strength > 20 && Math.random() < 0.35) {
          const adjacent = getAdjacentSectors(territory.sector);
          const adjacentTerritories = territories.filter(t => adjacent.includes(t.sector) && !t.active_threat_wave?.status);
          if (adjacentTerritories.length > 0) {
            splitTarget = pick(adjacentTerritories);
          }
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
          environmental_factor: envMult !== 1.0 ? {
            weather: world.weather,
            season: world.season,
            multiplier: envMult,
          } : null,
          targeted_base_id: targetedBase?.id || null,
          targeted_base_name: targetedBase?.name || null,
          split_wave_sector: splitTarget?.sector || null,
          ai_scaling: {
            intensity: intensityMult,
            narrative_theme: aiScaling.narrative_theme,
            escalation_note: aiScaling.escalation_note,
          },
        };

        await base44.asServiceRole.entities.Territory.update(territory.id, { active_threat_wave: wave });

        // If splitting, create a secondary wave on adjacent sector
        if (splitTarget) {
          const splitStrength = Math.round(strength * 0.45);
          const splitWave = {
            wave_id: `${waveId}_split`,
            threat_name: `${wave.threat_name} (Splinter)`,
            strength: splitStrength,
            type: archetype.type,
            behavior: "swarm",
            arriving_at: wave.arriving_at,
            status: "incoming",
            modifiers: [],
            environmental_factor: wave.environmental_factor,
            targeted_base_id: null,
            targeted_base_name: null,
            split_wave_sector: null,
            ai_scaling: wave.ai_scaling,
          };
          await base44.asServiceRole.entities.Territory.update(splitTarget.id, { active_threat_wave: splitWave });
          generated.push({ sector: splitTarget.sector, wave: splitWave, is_split: true });
        }

        // Notification
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
        ai_scaling: {
          intensity: intensityMult,
          target_count: targetCount,
          use_modifiers: useModifiers,
          preferred_behavior: preferredBehavior,
          narrative: aiScaling.narrative_theme,
          escalation: aiScaling.escalation_note,
        },
      });
    }

    // ─── RESOLVE ───
    if (action === "resolve" || action === "resolve_all") {
      const territories = await base44.asServiceRole.entities.Territory.filter({});
      const bases = await base44.asServiceRole.entities.PlayerBase.filter({});
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

        // Modifier effects on resolution
        const hasArmored = (wave.modifiers || []).some(m => m.id === "armored");
        const hasFlanking = (wave.modifiers || []).some(m => m.id === "flanking");
        const hasStealth = (wave.modifiers || []).some(m => m.id === "stealth");

        // Effective defense (modifiers can reduce it)
        let effectiveDefense = defense;
        if (hasArmored) effectiveDefense = Math.round(effectiveDefense * 0.8);
        if (hasFlanking) effectiveDefense = Math.round(effectiveDefense * 0.85);
        if (hasStealth) effectiveDefense = Math.round(effectiveDefense * 0.9);

        const held = effectiveDefense >= wave.strength;
        const margin = effectiveDefense - wave.strength;
        const marginPct = wave.strength > 0 ? Math.round((margin / wave.strength) * 100) : 100;

        let influenceDelta = 0;
        let newStatus = t.status;
        let defenseReduction = 0;
        let defenderLosses = 0;
        let baseDamage = null;

        if (held) {
          if (marginPct > 50) {
            // Crushing victory
            influenceDelta = 10;
          } else if (marginPct > 20) {
            // Solid defense
            influenceDelta = 5;
          } else {
            // Narrow hold — still takes minor damage
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

          // Targeted base takes direct damage
          if (wave.targeted_base_id) {
            const targetBase = bases.find(b => b.id === wave.targeted_base_id);
            if (targetBase) {
              const newDefLevel = Math.max(0, (targetBase.defense_level || 1) - (severity === "devastated" ? 2 : 1));
              const newBaseStatus = newDefLevel === 0 ? "under_siege" : targetBase.status;
              await base44.asServiceRole.entities.PlayerBase.update(targetBase.id, {
                defense_level: newDefLevel,
                status: newBaseStatus,
              });
              baseDamage = { base_name: targetBase.name, new_defense: newDefLevel, new_status: newBaseStatus };
            }
          }
        }

        // Update territory
        const newInfluence = Math.max(0, Math.min(100, (t.influence_level || 0) + influenceDelta));
        const newDefense = Math.max(0, (t.defense_power || 0) - defenseReduction);
        const newDefenders = Math.max(0, (t.defender_count || 0) - defenderLosses);

        // Generate AI narrative for the outcome
        let resultNarrative;
        try {
          const modDesc = (wave.modifiers || []).map(m => m.label).join(", ");
          resultNarrative = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Write a 2-sentence post-apocalyptic battle report. ${wave.threat_name} (STR ${wave.strength}${modDesc ? `, ${modDesc}` : ""}) attacked sector ${t.sector}. Defense: ${effectiveDefense}. ${held ? `Defense held${marginPct > 50 ? " decisively" : marginPct < 10 ? " barely" : ""}.` : `Defenses ${margin < -20 ? "were devastated" : margin < -10 ? "were overrun" : "were breached"}.`}${baseDamage ? ` Base "${baseDamage.base_name}" took direct damage.` : ""} Environmental conditions: ${wave.environmental_factor ? `${wave.environmental_factor.weather} (×${wave.environmental_factor.multiplier})` : "normal"}. Keep it gritty and tactical.`,
          });
        } catch {
          resultNarrative = held
            ? `Defense held against ${wave.threat_name} at sector ${t.sector} (DEF ${effectiveDefense} vs STR ${wave.strength}).`
            : `${wave.threat_name} breached sector ${t.sector} defenses (DEF ${effectiveDefense} vs STR ${wave.strength}). Significant damage sustained.`;
        }

        await base44.asServiceRole.entities.Territory.update(t.id, {
          active_threat_wave: { ...wave, status: "resolved" },
          last_wave_result: typeof resultNarrative === 'string' ? resultNarrative : JSON.stringify(resultNarrative),
          influence_level: newInfluence,
          status: newStatus,
          defense_power: newDefense,
          defender_count: newDefenders,
        });

        // Reduce injured defenders
        if (defenderLosses > 0) {
          const survivors = await base44.asServiceRole.entities.Survivor.filter({ current_task: "defend", status: "active" });
          const sectorDefenders = survivors.filter(s => {
            const sBase = bases.find(b => b.id === s.base_id);
            return sBase?.sector === t.sector;
          });
          for (let d = 0; d < defenderLosses && d < sectorDefenders.length; d++) {
            await base44.asServiceRole.entities.Survivor.update(sectorDefenders[d].id, {
              health: "injured",
              current_task: "idle",
            });
          }
        }

        // OpsLog
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
          wave_strength: wave.strength,
          modifiers: (wave.modifiers || []).map(m => m.label),
          base_damage: baseDamage,
          defender_losses: defenderLosses,
          influence_change: influenceDelta,
          result: typeof resultNarrative === 'string' ? resultNarrative : JSON.stringify(resultNarrative),
        });
      }

      // Apply colony morale damage
      if (colony && totalMoraleDamage > 0) {
        const newMorale = Math.max(0, (colony.morale ?? 50) - totalMoraleDamage);
        await base44.asServiceRole.entities.ColonyStatus.update(colony.id, { morale: newMorale });
      }

      return Response.json({ status: "ok", resolved: results.length, results, morale_damage: totalMoraleDamage });
    }

    return Response.json({ error: "Unknown action. Use 'generate', 'resolve', or 'resolve_all'" }, { status: 400 });
  } catch (error) {
    console.error("threatWaveEngine v2 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});