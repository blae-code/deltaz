import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * threatWaveEngine v4 — Enhanced threat simulation with:
 * - Nuanced per-sector defense distribution analysis for AI scaling
 * - Base module/upgrade awareness in target priority
 * - AI-driven environmental interaction modeling (weather patterns, seasonal chains)
 * - Survivor skill-based defense bonuses and XP rewards on resolution
 */

const WAVE_ARCHETYPES = [
  {
    type: "horde",
    names: ["Zombie Horde", "Shambler Swarm", "Dead Tide", "Rotting Legion", "Corpse Flood"],
    behavior: "swarm",
    can_split: true,
    env_weakness: ["thunderstorm", "blizzard"],
    env_strength: ["fog", "ashfall", "dust_storm"],
    season_bonus: { nuclear_winter: 0.3, autumn: 0.1 },
    season_penalty: { summer: -0.1 },
    base_morale_damage: 5,
  },
  {
    type: "raiders",
    names: ["Raider War Party", "Bandit Assault", "Scavenger Gang", "Marauder Blitz", "Warlord Vanguard"],
    behavior: "targeted",
    can_split: false,
    env_weakness: ["heavy_rain", "blizzard", "dust_storm"],
    env_strength: ["clear", "overcast"],
    season_bonus: { dry_season: 0.2, summer: 0.15 },
    season_penalty: { monsoon: -0.25, nuclear_winter: -0.15 },
    base_morale_damage: 3,
  },
  {
    type: "mutants",
    names: ["Mutant Pack", "Irradiated Beasts", "Toxic Crawlers", "Abomination Swarm", "Glowing Stalkers"],
    behavior: "adaptive",
    can_split: true,
    env_weakness: ["clear", "snow"],
    env_strength: ["radiation_storm", "ashfall", "acid_rain", "fog"],
    season_bonus: { nuclear_winter: 0.35, monsoon: 0.1 },
    season_penalty: { summer: -0.05 },
    base_morale_damage: 7,
  },
  {
    type: "storm",
    names: ["Radiation Storm", "Acid Rain Front", "Electromagnetic Pulse", "Toxic Miasma", "Ash Tempest"],
    behavior: "area",
    can_split: false,
    env_weakness: [],
    env_strength: ["radiation_storm", "dust_storm", "ashfall", "acid_rain"],
    season_bonus: { nuclear_winter: 0.4, monsoon: 0.2 },
    season_penalty: { dry_season: -0.15 },
    base_morale_damage: 4,
  },
  {
    type: "siege",
    names: ["Organized Siege Force", "Militia Assault Column", "Armored Convoy", "Fortification Breakers"],
    behavior: "siege",
    can_split: false,
    env_weakness: ["heavy_rain", "thunderstorm", "blizzard", "dust_storm"],
    env_strength: ["clear", "overcast"],
    season_bonus: { dry_season: 0.2, summer: 0.1 },
    season_penalty: { monsoon: -0.3, nuclear_winter: -0.2 },
    base_morale_damage: 10,
  },
];

const SPECIAL_MODIFIERS = [
  { id: "flanking", label: "Flanking Maneuver", strength_mult: 1.2, description: "Attack splits to hit from two directions", counter: "watchtower" },
  { id: "armored", label: "Armored Vanguard", strength_mult: 1.4, description: "Lead units absorb initial defense fire", counter: "defensive_turret" },
  { id: "stealth", label: "Stealth Approach", strength_mult: 1.1, description: "Defenders get less warning time", counter: "comms_tower" },
  { id: "berserk", label: "Berserk Frenzy", strength_mult: 1.5, description: "Reckless but devastating charge", counter: "armory" },
  { id: "tactical", label: "Tactical Formation", strength_mult: 1.3, description: "Coordinated assault targeting weak points", counter: "watchtower" },
  { id: "overwhelming", label: "Overwhelming Numbers", strength_mult: 1.6, description: "Sheer numbers threaten to overrun positions", counter: "defensive_turret" },
  { id: "corrosive", label: "Corrosive Payload", strength_mult: 1.25, description: "Acid dissolves fortifications over time", counter: "workshop" },
  { id: "nightraid", label: "Night Raid", strength_mult: 1.15, description: "Attack under cover of darkness, reduced visibility", counter: "solar_array" },
];

// Weather transition chains — what the current weather could shift to during the wave
const WEATHER_CHAINS = {
  clear: ["overcast", "fog"],
  overcast: ["rain", "fog", "dust_storm"],
  fog: ["rain", "overcast"],
  rain: ["heavy_rain", "thunderstorm"],
  heavy_rain: ["thunderstorm", "rain"],
  thunderstorm: ["heavy_rain", "rain", "clear"],
  snow: ["blizzard", "overcast"],
  blizzard: ["snow", "overcast"],
  dust_storm: ["ashfall", "overcast"],
  ashfall: ["acid_rain", "dust_storm", "radiation_storm"],
  acid_rain: ["radiation_storm", "ashfall", "overcast"],
  radiation_storm: ["ashfall", "acid_rain", "overcast"],
};

const SEASON_WEATHER_BIAS = {
  spring: { rain: 0.3, thunderstorm: 0.15, clear: 0.2 },
  summer: { clear: 0.4, dust_storm: 0.15, overcast: 0.1 },
  autumn: { fog: 0.3, overcast: 0.25, rain: 0.15 },
  winter: { snow: 0.3, blizzard: 0.2, overcast: 0.15 },
  nuclear_winter: { radiation_storm: 0.25, ashfall: 0.2, blizzard: 0.2, snow: 0.1 },
  dry_season: { clear: 0.3, dust_storm: 0.25, overcast: 0.15 },
  monsoon: { heavy_rain: 0.3, thunderstorm: 0.25, rain: 0.2 },
};

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

/**
 * Enhanced environmental multiplier using weather chains, seasonal modifiers,
 * and daylight phase interactions.
 */
function calcEnvironmentalMultiplier(archetype, weather, season, daylight) {
  let mult = 1.0;

  // Direct weather match
  if (archetype.env_strength.includes(weather)) mult += 0.25;
  if (archetype.env_weakness.includes(weather)) mult -= 0.25;

  // Seasonal modifiers (per-archetype)
  if (archetype.season_bonus && archetype.season_bonus[season]) {
    mult += archetype.season_bonus[season];
  }
  if (archetype.season_penalty && archetype.season_penalty[season]) {
    mult += archetype.season_penalty[season];
  }

  // Daylight phase
  if (daylight === "night" || daylight === "midnight") mult += 0.2;
  else if (daylight === "dusk" || daylight === "dawn") mult += 0.08;
  else if (daylight === "midday" && archetype.type === "mutants") mult -= 0.1;

  // Weather chain potential — if current weather can shift to a strength, slight bonus
  const possibleShifts = WEATHER_CHAINS[weather] || [];
  const chainBonus = possibleShifts.some(w => archetype.env_strength.includes(w)) ? 0.08 : 0;
  mult += chainBonus;

  // Seasonal weather synergy — if the season biases toward this archetype's strengths
  const seasonBias = SEASON_WEATHER_BIAS[season] || {};
  const synergyBonus = archetype.env_strength.reduce((sum, w) => sum + (seasonBias[w] || 0), 0) * 0.3;
  mult += synergyBonus;

  return Math.max(0.4, Math.min(2.5, mult));
}

/**
 * Build a detailed defense profile for each sector including:
 * - Territory defense power
 * - Bases in sector with defense levels and module counts
 * - Defender survivors with skill levels
 * - Module-specific countermeasures
 */
function buildSectorDefenseProfile(territory, bases, modules, survivors) {
  const sectorBases = bases.filter(b => b.sector === territory.sector && b.status === "active");
  const sectorModules = modules.filter(m =>
    sectorBases.some(b => b.id === m.base_id) && m.status === "active"
  );
  const sectorDefenders = survivors.filter(s => {
    if (s.status !== "active") return false;
    if (s.current_task !== "defend" && s.current_task !== "patrol") return false;
    return sectorBases.some(b => b.id === s.base_id);
  });

  // Module breakdown
  const moduleTypes = {};
  for (const m of sectorModules) {
    moduleTypes[m.module_type] = (moduleTypes[m.module_type] || 0) + 1;
  }

  // Aggregate base upgrades
  const totalBaseDefLevel = sectorBases.reduce((s, b) => s + (b.defense_level || 1), 0);
  const maxBaseDefLevel = sectorBases.length > 0 ? Math.max(...sectorBases.map(b => b.defense_level || 1)) : 0;

  // Defender skill summary
  const defenderSkillAvg = sectorDefenders.length > 0 ? {
    combat: Math.round(sectorDefenders.reduce((s, d) => s + getSkillLevel((d.skills || {}).combat || 0), 0) / sectorDefenders.length * 10) / 10,
    survival: Math.round(sectorDefenders.reduce((s, d) => s + getSkillLevel((d.skills || {}).survival || 0), 0) / sectorDefenders.length * 10) / 10,
    leadership: Math.round(sectorDefenders.reduce((s, d) => s + getSkillLevel((d.skills || {}).leadership || 0), 0) / sectorDefenders.length * 10) / 10,
  } : null;

  // Countermeasure strength (which modifiers are countered by modules here)
  const counterModifiers = SPECIAL_MODIFIERS
    .filter(m => moduleTypes[m.counter])
    .map(m => m.id);

  return {
    sector: territory.sector,
    territory_defense: territory.defense_power || 0,
    threat_level: territory.threat_level || "moderate",
    status: territory.status,
    influence: territory.influence_level || 0,
    bases: sectorBases.length,
    total_base_def_level: totalBaseDefLevel,
    max_base_def_level: maxBaseDefLevel,
    modules: moduleTypes,
    module_count: sectorModules.length,
    defenders: sectorDefenders.length,
    defender_skills: defenderSkillAvg,
    countered_modifiers: counterModifiers,
    vulnerability_score: Math.max(0, 100 - (territory.defense_power || 0) * 3 - sectorDefenders.length * 8 - sectorModules.length * 5 - totalBaseDefLevel * 4),
  };
}

function calcSkillDefenseBonus(defenders) {
  let bonus = 0;
  for (const d of defenders) {
    const skills = d.skills || {};
    const combatLevel = getSkillLevel(skills.combat || 0);
    const survivalLevel = getSkillLevel(skills.survival || 0);
    const leadershipLevel = getSkillLevel(skills.leadership || 0);
    bonus += combatLevel * 1.5 + survivalLevel * 0.5;
    if (leadershipLevel >= 3) bonus += 2;
  }
  return Math.round(bonus);
}

/**
 * Calculate module-based defense bonus during resolution.
 * Active modules in the sector provide specific combat bonuses.
 */
function calcModuleDefenseBonus(modules) {
  let bonus = 0;
  for (const m of modules) {
    if (m.status !== "active") continue;
    const level = m.level || 1;
    switch (m.module_type) {
      case "defensive_turret": bonus += 3 * level; break;
      case "watchtower": bonus += 2 * level; break;
      case "armory": bonus += 1.5 * level; break;
      case "comms_tower": bonus += 1 * level; break;
      default: break;
    }
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
      const [territories, bases, allModules, allSurvivors, worldList, colonyList] = await Promise.all([
        base44.asServiceRole.entities.Territory.filter({}),
        base44.asServiceRole.entities.PlayerBase.filter({}),
        base44.asServiceRole.entities.BaseModule.filter({}),
        base44.asServiceRole.entities.Survivor.filter({ status: "active" }),
        base44.asServiceRole.entities.WorldConditions.list("-updated_date", 1),
        base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1),
      ]);

      const activeBases = bases.filter(b => b.status === "active");
      const world = worldList[0] || {};
      const colony = colonyList[0];
      const colonyMorale = colony?.morale ?? 50;

      // Build per-sector defense profiles
      const sectorProfiles = territories
        .filter(t => t.status !== "uncharted")
        .map(t => buildSectorDefenseProfile(t, activeBases, allModules, allSurvivors));

      // Aggregate stats
      const totalDefense = sectorProfiles.reduce((s, p) => s + p.territory_defense, 0);
      const avgDefense = sectorProfiles.length > 0 ? totalDefense / sectorProfiles.length : 0;
      const maxDefense = Math.max(...sectorProfiles.map(p => p.territory_defense), 1);
      const minDefense = Math.min(...sectorProfiles.map(p => p.territory_defense));
      const defenseStdDev = sectorProfiles.length > 1
        ? Math.sqrt(sectorProfiles.reduce((s, p) => s + Math.pow(p.territory_defense - avgDefense, 2), 0) / sectorProfiles.length)
        : 0;
      const securedCount = territories.filter(t => t.status === "secured").length;
      const totalModules = allModules.filter(m => m.status === "active").length;
      const totalDefenders = allSurvivors.filter(s => s.current_task === "defend" || s.current_task === "patrol").length;

      // Defense distribution classification
      const defenseDistribution = defenseStdDev < 3 ? "even" : defenseStdDev < 8 ? "moderate_gaps" : "highly_uneven";

      // Environmental forecast
      const possibleWeatherShifts = WEATHER_CHAINS[world.weather] || [];
      const seasonBias = SEASON_WEATHER_BIAS[world.season] || {};
      const likelyNextWeather = possibleWeatherShifts
        .map(w => ({ weather: w, prob: seasonBias[w] || 0.05 }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3);

      // Top 5 most vulnerable sectors for AI analysis
      const vulnerableSectors = [...sectorProfiles]
        .sort((a, b) => b.vulnerability_score - a.vulnerability_score)
        .slice(0, 5)
        .map(p => `${p.sector}: DEF ${p.territory_defense}, ${p.defenders} defenders${p.defender_skills ? ` (avg combat Lv${p.defender_skills.combat})` : ''}, ${p.bases} bases (max upgrade Lv${p.max_base_def_level}), ${p.module_count} modules${p.countered_modifiers.length > 0 ? ` [counters: ${p.countered_modifiers.join(',')}]` : ''}, vulnerability: ${p.vulnerability_score}/100`)
        .join('\n');

      // Top 3 fortified sectors
      const fortifiedSectors = [...sectorProfiles]
        .sort((a, b) => a.vulnerability_score - b.vulnerability_score)
        .slice(0, 3)
        .map(p => `${p.sector}: DEF ${p.territory_defense}, ${p.defenders} defenders, ${p.module_count} modules (${Object.entries(p.modules).map(([k,v]) => `${k}×${v}`).join(', ') || 'none'}), vulnerability: ${p.vulnerability_score}/100`)
        .join('\n');

      let aiScaling;
      try {
        aiScaling = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a tactical threat simulation AI for a post-apocalyptic survival game. Your job is to create challenging but fair threat waves by exploiting weaknesses in player defenses while respecting their investments.

═══ DEFENSE DISTRIBUTION ANALYSIS ═══
- ${sectorProfiles.length} mapped sectors, ${securedCount} secured
- Defense spread: avg ${avgDefense.toFixed(1)}, min ${minDefense}, max ${maxDefense}, std-dev ${defenseStdDev.toFixed(1)} → distribution: ${defenseDistribution}
- ${activeBases.length} active bases, ${totalModules} active modules, ${totalDefenders} deployed defenders
- Colony morale: ${colonyMorale}%
- Active incoming waves: ${territories.filter(t => t.active_threat_wave?.status === "incoming").length}

═══ MOST VULNERABLE SECTORS ═══
${vulnerableSectors}

═══ MOST FORTIFIED SECTORS ═══
${fortifiedSectors}

═══ ENVIRONMENTAL STATE ═══
- Current: ${world.weather || "unknown"} weather, ${world.season || "unknown"} season, ${world.daylight_phase || "unknown"} phase, ${world.temperature_c ?? "?"}°C, wind: ${world.wind || "unknown"}, visibility: ${world.visibility || "unknown"}
- Radiation: ${world.radiation_level || "safe"}
- Weather forecast (likely shifts): ${likelyNextWeather.map(w => `${w.weather} (${Math.round(w.prob * 100)}%)`).join(', ') || 'stable'}
- Season weather bias: ${Object.entries(seasonBias).slice(0, 4).map(([w, p]) => `${w}: ${Math.round(p * 100)}%`).join(', ') || 'none'}
${(world.special_conditions || []).length > 0 ? `- Special conditions: ${world.special_conditions.join(', ')}` : ''}

═══ AVAILABLE THREAT TYPES ═══
- horde (swarm, can split) — strong in fog/ashfall, weak in storms. Season: boosted in nuclear winter
- raiders (targeted) — strong in clear weather, weak in rain/blizzard. Season: boosted in dry season
- mutants (adaptive, can split) — strong in radiation/acid rain, weak in clear. Season: boosted in nuclear winter
- storm (area effect) — strong in radiation/dust storms. Season: boosted in nuclear winter/monsoon
- siege (sustained assault) — strong in clear weather, weak in storms. Season: boosted in dry season

═══ AVAILABLE MODIFIERS ═══
flanking (×1.2, countered by watchtower), armored (×1.4, countered by defensive_turret), stealth (×1.1, countered by comms_tower), berserk (×1.5, countered by armory), tactical (×1.3, countered by watchtower), overwhelming (×1.6, countered by defensive_turret), corrosive (×1.25, countered by workshop), nightraid (×1.15, countered by solar_array)

═══ YOUR TASK ═══
Analyze the defense distribution and environmental conditions to generate a STRATEGIC threat wave plan:

1. **intensity_multiplier** (0.5-2.5): Scale based on overall defense strength. If defenses are ${defenseDistribution}, consider how to challenge without obliterating.
2. **target_count** (1-5): How many sectors to hit simultaneously. Use defense gaps — if ${defenseDistribution}, multi-pronged attacks exploit weakness.
3. **use_special_modifiers**: true if you want to add tactical complexity. Consider whether players have module countermeasures.
4. **preferred_modifiers**: array of modifier IDs to prefer. ONLY pick modifiers that are NOT countered by modules in vulnerable sectors. This is key — reward players who built the right modules.
5. **preferred_behavior**: "swarm"|"targeted"|"adaptive"|"area"|"siege"|"random" — pick based on which archetype synergizes with current weather/season.
6. **preferred_archetype**: the threat type that best exploits current environmental conditions
7. **target_sectors**: array of sector codes to prioritize (from the vulnerable list). Explain WHY each was chosen.
8. **environmental_narrative**: 2-sentence description of how weather/season affects this wave — will be shown to players
9. **weather_shift_expected**: if the weather might shift during the wave, note it and how it changes the threat
10. **narrative_theme**: 1-sentence dramatic theme for the wave
11. **escalation_note**: tactical reasoning for your choices`,
          response_json_schema: {
            type: "object",
            properties: {
              intensity_multiplier: { type: "number" },
              target_count: { type: "number" },
              use_special_modifiers: { type: "boolean" },
              preferred_modifiers: { type: "array", items: { type: "string" } },
              preferred_behavior: { type: "string" },
              preferred_archetype: { type: "string" },
              target_sectors: { type: "array", items: { type: "string" } },
              environmental_narrative: { type: "string" },
              weather_shift_expected: { type: "string" },
              narrative_theme: { type: "string" },
              escalation_note: { type: "string" },
            },
          },
        });
      } catch {
        // Fallback: use defense distribution to determine scaling
        const weakest = sectorProfiles.sort((a, b) => b.vulnerability_score - a.vulnerability_score);
        aiScaling = {
          intensity_multiplier: avgDefense > 15 ? 1.4 : avgDefense > 8 ? 1.0 : 0.7,
          target_count: defenseDistribution === "highly_uneven" ? 3 : 2,
          use_special_modifiers: avgDefense > 10,
          preferred_modifiers: [],
          preferred_behavior: "random",
          preferred_archetype: "random",
          target_sectors: weakest.slice(0, 2).map(p => p.sector),
          environmental_narrative: "The wasteland conditions shape the incoming threat.",
          weather_shift_expected: "",
          narrative_theme: "The wasteland stirs with new threats.",
          escalation_note: "Automated scaling fallback.",
        };
      }

      const intensityMult = Math.max(0.5, Math.min(2.5, aiScaling.intensity_multiplier || 1.0));
      const targetCount = Math.max(1, Math.min(5, Math.round(aiScaling.target_count || 2)));
      const useModifiers = aiScaling.use_special_modifiers ?? false;
      const preferredBehavior = aiScaling.preferred_behavior || "random";
      const preferredArchetype = aiScaling.preferred_archetype || "random";
      const preferredModifiers = aiScaling.preferred_modifiers || [];
      const aiTargetSectors = aiScaling.target_sectors || [];

      const eligible = territories.filter(t =>
        t.status !== "uncharted" &&
        (!t.active_threat_wave || t.active_threat_wave.status !== "incoming")
      );

      // Score sectors — AI target suggestions get priority
      const scored = eligible.map(t => {
        const profile = sectorProfiles.find(p => p.sector === t.sector);
        let score = { minimal: 5, low: 15, moderate: 30, high: 55, critical: 80 }[t.threat_level] || 10;

        // AI-suggested targets get large boost
        if (aiTargetSectors.includes(t.sector)) score += 40;

        // Vulnerability-based scoring
        if (profile) score += profile.vulnerability_score * 0.5;

        // Bases in sector
        if (activeBases.some(b => b.sector === t.sector)) score += 15;

        // High influence = strategic target
        if ((t.influence_level || 0) > 50) score += 10;

        // Undefended sectors with bases = high-value soft targets
        if (profile && profile.defenders === 0 && profile.bases > 0) score += 25;

        return { territory: t, score, profile };
      }).sort((a, b) => b.score - a.score);

      const generated = [];
      const toTarget = force ? Math.min(scored.length, targetCount) : scored.length;

      for (let i = 0; i < toTarget && generated.length < targetCount; i++) {
        const { territory, score, profile } = scored[i];
        const prob = Math.min(0.95, score / 100);
        if (!force && Math.random() > prob) continue;

        // Pick archetype — prefer AI suggestion, then environmental best-fit
        let archetype;
        if (preferredArchetype !== "random") {
          archetype = WAVE_ARCHETYPES.find(a => a.type === preferredArchetype);
        }
        if (!archetype && preferredBehavior !== "random") {
          archetype = WAVE_ARCHETYPES.find(a => a.behavior === preferredBehavior);
        }
        if (!archetype) {
          // Pick the archetype that benefits most from current environment
          const envScored = WAVE_ARCHETYPES.map(a => ({
            arch: a,
            envMult: calcEnvironmentalMultiplier(a, world.weather, world.season, world.daylight_phase),
          })).sort((a, b) => b.envMult - a.envMult);
          // 60% chance to pick the best env match, 40% random
          archetype = Math.random() < 0.6 ? envScored[0].arch : pick(WAVE_ARCHETYPES);
        }

        const sectorBases = activeBases.filter(b => b.sector === territory.sector);
        const targetedBase = sectorBases.length > 0 && (archetype.behavior === "targeted" || archetype.behavior === "siege")
          ? sectorBases.sort((a, b) => (a.defense_level || 1) - (b.defense_level || 1))[0] // Target weakest base
          : null;

        const envMult = calcEnvironmentalMultiplier(archetype, world.weather, world.season, world.daylight_phase);

        // Strength scaling considers sector-specific defense
        const basePower = { minimal: 4, low: 8, moderate: 14, high: 22, critical: 35 }[territory.threat_level] || 12;
        const sectorDef = profile?.territory_defense || 0;
        const moduleStrength = profile?.module_count || 0;
        const defenseAdaptation = Math.max(1, sectorDef * 0.5 + moduleStrength * 1.5);
        let strength = Math.round((basePower + defenseAdaptation * 0.5 + rand(0, basePower)) * intensityMult * envMult);

        // Pick modifiers — prefer AI suggestions, avoid countered ones
        const modifiers = [];
        if (useModifiers && Math.random() < 0.5) {
          const counteredInSector = profile?.countered_modifiers || [];

          // Prefer AI-suggested modifiers that aren't countered
          let selectedMod = null;
          for (const prefId of preferredModifiers) {
            if (!counteredInSector.includes(prefId)) {
              selectedMod = SPECIAL_MODIFIERS.find(m => m.id === prefId);
              if (selectedMod) break;
            }
          }
          // Fallback: pick any uncountered modifier
          if (!selectedMod) {
            const uncountered = SPECIAL_MODIFIERS.filter(m => !counteredInSector.includes(m.id));
            if (uncountered.length > 0) selectedMod = pick(uncountered);
          }
          // Last resort: any modifier (player's modules will help)
          if (!selectedMod) selectedMod = pick(SPECIAL_MODIFIERS);

          if (selectedMod) {
            modifiers.push(selectedMod);
            strength = Math.round(strength * selectedMod.strength_mult);
          }
        }

        // Splitting — prefer splitting toward weakly-defended adjacent sectors
        let splitTarget = null;
        if (archetype.can_split && strength > 20 && Math.random() < 0.35) {
          const adjacent = getAdjacentSectors(territory.sector);
          const adjacentTerritories = territories
            .filter(t => adjacent.includes(t.sector) && !t.active_threat_wave?.status)
            .map(t => ({ t, profile: sectorProfiles.find(p => p.sector === t.sector) }))
            .sort((a, b) => (b.profile?.vulnerability_score || 50) - (a.profile?.vulnerability_score || 50));
          if (adjacentTerritories.length > 0) splitTarget = adjacentTerritories[0].t;
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
          environmental_factor: {
            weather: world.weather,
            season: world.season,
            daylight: world.daylight_phase,
            multiplier: envMult,
            narrative: aiScaling.environmental_narrative || null,
            weather_shift: aiScaling.weather_shift_expected || null,
          },
          targeted_base_id: targetedBase?.id || null,
          targeted_base_name: targetedBase?.name || null,
          split_wave_sector: splitTarget?.sector || null,
          ai_scaling: {
            intensity: intensityMult,
            narrative_theme: aiScaling.narrative_theme,
            escalation_note: aiScaling.escalation_note,
            defense_distribution: defenseDistribution,
            sector_vulnerability: profile?.vulnerability_score || 0,
          },
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
          message: `STR ${strength} inbound to sector ${territory.sector}${baseLabel}${splitLabel}. Env: ${world.weather} ×${envMult.toFixed(2)}. ${aiScaling.narrative_theme || ""}`,
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
          preferred_archetype: preferredArchetype,
          preferred_modifiers: preferredModifiers,
          target_sectors: aiTargetSectors,
          defense_distribution: defenseDistribution,
          environmental_narrative: aiScaling.environmental_narrative,
          weather_shift: aiScaling.weather_shift_expected,
          narrative: aiScaling.narrative_theme,
          escalation: aiScaling.escalation_note,
        },
      });
    }

    // ─── RESOLVE ───
    if (action === "resolve" || action === "resolve_all") {
      const [territories, bases, allModules, allSurvivors, colonyList] = await Promise.all([
        base44.asServiceRole.entities.Territory.filter({}),
        base44.asServiceRole.entities.PlayerBase.filter({}),
        base44.asServiceRole.entities.BaseModule.filter({}),
        base44.asServiceRole.entities.Survivor.filter({ status: "active" }),
        base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1),
      ]);
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

        // Skill-based defense bonus
        const activeBases = bases.filter(b => b.status === "active");
        const sectorDefenders = allSurvivors.filter(s => {
          if (s.current_task !== "defend" && s.current_task !== "patrol") return false;
          const sBase = bases.find(b => b.id === s.base_id);
          return sBase?.sector === t.sector;
        });
        const skillBonus = calcSkillDefenseBonus(sectorDefenders);
        effectiveDefense += skillBonus;

        // Module-based defense bonus
        const sectorBases = activeBases.filter(b => b.sector === t.sector);
        const sectorModules = allModules.filter(m =>
          sectorBases.some(b => b.id === m.base_id) && m.status === "active"
        );
        const moduleBonus = calcModuleDefenseBonus(sectorModules);
        effectiveDefense += moduleBonus;

        // Check if any modules counter the wave's modifiers — reduce their effectiveness
        let modifierMitigated = false;
        for (const wMod of (wave.modifiers || [])) {
          const modDef = SPECIAL_MODIFIERS.find(m => m.id === wMod.id);
          if (modDef && sectorModules.some(m => m.module_type === modDef.counter && m.status === "active")) {
            // Module counters the modifier — restore some defense
            effectiveDefense = Math.round(effectiveDefense * 1.1);
            modifierMitigated = true;
          }
        }

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

        const newInfluence = Math.max(0, Math.min(100, (t.influence_level || 0) + influenceDelta));
        const newDefense = Math.max(0, (t.defense_power || 0) - defenseReduction);
        const newDefenders = Math.max(0, (t.defender_count || 0) - defenderLosses);

        // Award combat XP to defenders
        const xpRewards = [];
        for (const defender of sectorDefenders) {
          const baseXp = held ? 15 : 8;
          const criticalBonus = marginPct < 10 && held ? 10 : 0;
          const combatXp = baseXp + criticalBonus;
          const survivalXp = held ? 5 : 8;
          const leadershipXp = sectorDefenders.length > 2 ? 3 : 0;

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
          const envInfo = wave.environmental_factor;
          resultNarrative = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Write a 2-3 sentence post-apocalyptic battle report. ${wave.threat_name} (STR ${wave.strength}${modDesc ? `, ${modDesc}` : ""}) attacked sector ${t.sector}. Total defense: ${effectiveDefense} (base ${defense} + ${skillBonus} skill + ${moduleBonus} modules${modifierMitigated ? " + modifier countermeasures" : ""}). ${held ? `Defense held${marginPct > 50 ? " decisively" : marginPct < 10 ? " barely" : ""}.` : `Defenses ${margin < -20 ? "were devastated" : margin < -10 ? "were overrun" : "were breached"}.`}${baseDamage ? ` Base "${baseDamage.base_name}" took direct damage.` : ""} Environment: ${envInfo?.weather || "normal"} (×${envInfo?.multiplier?.toFixed(2) || "1.00"}), ${envInfo?.season || "unknown"} season. ${envInfo?.narrative || ""} ${modifierMitigated ? "Defensive modules neutralized enemy tactical advantages." : ""} Be gritty and tactical.`,
          });
        } catch {
          resultNarrative = held
            ? `Defense held against ${wave.threat_name} at sector ${t.sector} (DEF ${effectiveDefense} vs STR ${wave.strength}). Skill (+${skillBonus}) and module (+${moduleBonus}) bonuses were decisive.`
            : `${wave.threat_name} breached sector ${t.sector} (DEF ${effectiveDefense} vs STR ${wave.strength}). Despite +${skillBonus} skill and +${moduleBonus} module bonus, positions were overrun.`;
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
          module_bonus: moduleBonus,
          modifier_mitigated: modifierMitigated,
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
    console.error("threatWaveEngine v4 error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});