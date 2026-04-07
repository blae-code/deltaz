import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

/**
 * weatherSimulation — Regional weather engine that:
 * 1. Generates per-sector weather conditions based on season, world conditions, and randomness
 * 2. Applies resource production penalties/bonuses to colony based on weather
 * 3. Applies health/status effects to survivors in affected sectors
 * 4. Returns full sector weather map for overlay rendering
 */

const HAZARD_TYPES = {
  acid_rain: {
    label: "Acid Rain",
    color: "#7cfc00",
    icon: "cloud-rain",
    effects: { medical: -5, water: -3, morale: -3 },
    survivor_effects: { health: "sick", stress_add: 10, rest_drain: 5 },
    severity_range: [1, 4],
    seasons: ["autumn", "nuclear_winter", "monsoon"],
    weather_triggers: ["rain", "heavy_rain", "acid_rain", "thunderstorm"],
  },
  dust_storm: {
    label: "Dust Storm",
    color: "#d4a13a",
    icon: "wind",
    effects: { food: -4, power: -6, defense: -3 },
    survivor_effects: { health: "injured", stress_add: 15, rest_drain: 10 },
    severity_range: [2, 5],
    seasons: ["summer", "dry_season", "autumn"],
    weather_triggers: ["dust_storm", "ashfall", "strong_wind"],
  },
  freezing_cold: {
    label: "Freezing Cold",
    color: "#5ba8c8",
    icon: "snowflake",
    effects: { food: -6, power: -8, morale: -5 },
    survivor_effects: { health: "sick", stress_add: 12, rest_drain: 15 },
    severity_range: [1, 5],
    seasons: ["winter", "nuclear_winter"],
    weather_triggers: ["snow", "blizzard"],
  },
  radiation_storm: {
    label: "Radiation Storm",
    color: "#c53030",
    icon: "zap",
    effects: { medical: -8, food: -3, morale: -8 },
    survivor_effects: { health: "critical", stress_add: 25, rest_drain: 20 },
    severity_range: [3, 5],
    seasons: ["nuclear_winter"],
    weather_triggers: ["radiation_storm"],
  },
  toxic_fog: {
    label: "Toxic Fog",
    color: "#9b59b6",
    icon: "cloud",
    effects: { medical: -4, food: -2, defense: -2 },
    survivor_effects: { health: "sick", stress_add: 8, rest_drain: 8 },
    severity_range: [1, 3],
    seasons: ["autumn", "monsoon", "spring"],
    weather_triggers: ["fog", "ashfall", "overcast"],
  },
  heatwave: {
    label: "Heatwave",
    color: "#e74c3c",
    icon: "thermometer",
    effects: { water: -8, food: -4, morale: -4 },
    survivor_effects: { health: "sick", stress_add: 10, rest_drain: 12 },
    severity_range: [2, 4],
    seasons: ["summer", "dry_season"],
    weather_triggers: ["clear"],
  },
};

const ROWS = ["A", "B", "C", "D", "E"];
const COLS = [1, 2, 3, 4, 5];

function getAllSectors() {
  const sectors = [];
  for (const r of ROWS) {
    for (const c of COLS) {
      sectors.push(`${r}-${c}`);
    }
  }
  return sectors;
}

function pickHazard(worldConditions, sector, territories) {
  const season = worldConditions?.season || "autumn";
  const weather = worldConditions?.weather || "overcast";
  const temp = worldConditions?.temperature_c ?? 15;
  const radiation = worldConditions?.radiation_level || "safe";

  // Territory context
  const territory = territories.find(t => t.sector === sector);
  const threat = territory?.threat_level || "minimal";

  // Score each hazard
  const candidates = [];
  for (const [key, hazard] of Object.entries(HAZARD_TYPES)) {
    let score = 0;

    if (hazard.seasons.includes(season)) score += 30;
    if (hazard.weather_triggers.includes(weather)) score += 25;

    // Temperature bonuses
    if (key === "freezing_cold" && temp < 0) score += 20;
    if (key === "heatwave" && temp > 35) score += 20;
    if (key === "radiation_storm" && (radiation === "high" || radiation === "lethal")) score += 30;
    if (key === "dust_storm" && temp > 25) score += 10;

    // Threat level increases hazard chance
    const threatBonus = { minimal: 0, low: 5, moderate: 10, high: 20, critical: 30 }[threat] || 0;
    score += threatBonus;

    // Random variance
    score += Math.random() * 20;

    if (score > 25) {
      candidates.push({ key, score, hazard });
    }
  }

  if (candidates.length === 0) return null;

  // Weighted random selection
  candidates.sort((a, b) => b.score - a.score);
  const roll = Math.random();
  if (roll < 0.4) return candidates[0];
  if (roll < 0.7 && candidates.length > 1) return candidates[1];
  if (candidates.length > 2) return candidates[Math.floor(Math.random() * candidates.length)];
  return candidates[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "simulate";

    if (action === "simulate") {
      return await handleSimulate(base44, user, body);
    } else if (action === "apply_effects") {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin required' }, { status: 403 });
      }
      return await handleApplyEffects(base44, body);
    } else if (action === "get_weather_map") {
      return await handleGetWeatherMap(base44);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error("weatherSimulation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleSimulate(base44, user, body) {
  const [worldConditions, territories] = await Promise.all([
    base44.asServiceRole.entities.WorldConditions.list("-updated_date", 1).then(r => r[0] || null),
    base44.asServiceRole.entities.Territory.filter({}),
  ]);

  const sectors = getAllSectors();
  const weatherMap = {};
  const hazardCoverage = body.hazard_coverage || 0.35; // 35% of sectors get a hazard

  for (const sector of sectors) {
    const hasHazard = Math.random() < hazardCoverage;
    if (!hasHazard) {
      weatherMap[sector] = {
        hazard: null,
        severity: 0,
        label: "Clear",
        color: null,
        effects: {},
        description: "No hazardous conditions",
      };
      continue;
    }

    const pick = pickHazard(worldConditions, sector, territories);
    if (!pick) {
      weatherMap[sector] = {
        hazard: null,
        severity: 0,
        label: "Clear",
        color: null,
        effects: {},
        description: "No hazardous conditions",
      };
      continue;
    }

    const { key, hazard } = pick;
    const [minSev, maxSev] = hazard.severity_range;
    const severity = Math.floor(Math.random() * (maxSev - minSev + 1)) + minSev;

    const scaledEffects = {};
    for (const [res, val] of Object.entries(hazard.effects)) {
      scaledEffects[res] = Math.round(val * (severity / 3));
    }

    weatherMap[sector] = {
      hazard: key,
      severity,
      label: hazard.label,
      color: hazard.color,
      icon: hazard.icon,
      effects: scaledEffects,
      survivor_effects: hazard.survivor_effects,
      description: `${hazard.label} (Severity ${severity}/5)`,
    };
  }

  // AI-generate a brief weather bulletin
  let bulletin = "";
  const hazardSectors = Object.entries(weatherMap).filter(([, v]) => v.hazard);
  if (hazardSectors.length > 0) {
    const hazardSummary = {};
    hazardSectors.forEach(([sector, data]) => {
      if (!hazardSummary[data.label]) hazardSummary[data.label] = [];
      hazardSummary[data.label].push(sector);
    });

    try {
      bulletin = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a wasteland weather station AI. Generate a 2-3 sentence atmospheric weather bulletin for this hazard report:
${Object.entries(hazardSummary).map(([type, sects]) => `- ${type}: sectors ${sects.join(", ")}`).join("\n")}
Season: ${worldConditions?.season || "unknown"}
Current weather: ${worldConditions?.weather || "unknown"}
Temperature: ${worldConditions?.temperature_c ?? "?"}°C

Be gritty and atmospheric. Warn survivors of the dangers.`,
      });
    } catch {
      bulletin = `WARNING: ${hazardSectors.length} sectors reporting hazardous conditions. Exercise extreme caution.`;
    }
  }

  return Response.json({
    status: "ok",
    weather_map: weatherMap,
    bulletin,
    stats: {
      total_sectors: sectors.length,
      hazardous: hazardSectors.length,
      clear: sectors.length - hazardSectors.length,
      hazard_types: [...new Set(hazardSectors.map(([, v]) => v.label))],
    },
  });
}

async function handleApplyEffects(base44, body) {
  const weatherMap = body.weather_map;
  if (!weatherMap) {
    return Response.json({ error: 'weather_map required' }, { status: 400 });
  }

  const [colony, bases, survivors] = await Promise.all([
    base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1).then(r => r[0] || null),
    base44.asServiceRole.entities.PlayerBase.filter({ status: "active" }),
    base44.asServiceRole.entities.Survivor.filter({ status: "active" }),
  ]);

  // Apply colony-wide resource effects
  const colonyEffects = { food: 0, water: 0, medical: 0, power: 0, defense: 0, morale: 0 };
  const affectedBases = [];

  for (const base of bases) {
    const sector = base.sector;
    if (!sector || !weatherMap[sector]?.hazard) continue;

    const wx = weatherMap[sector];
    affectedBases.push({ base_name: base.name, sector, hazard: wx.label, severity: wx.severity });

    for (const [res, delta] of Object.entries(wx.effects)) {
      colonyEffects[res] = (colonyEffects[res] || 0) + delta;
    }
  }

  // Update colony
  if (colony) {
    const colonyUpdate = {};
    const resourceMap = {
      food: "food_reserves",
      water: "water_supply",
      medical: "medical_supplies",
      power: "power_level",
      defense: "defense_integrity",
      morale: "morale",
    };

    for (const [key, field] of Object.entries(resourceMap)) {
      if (colonyEffects[key] !== 0) {
        colonyUpdate[field] = Math.max(0, Math.min(100, (colony[field] || 0) + colonyEffects[key]));
      }
    }

    if (Object.keys(colonyUpdate).length > 0) {
      await base44.asServiceRole.entities.ColonyStatus.update(colony.id, colonyUpdate);
    }
  }

  // Apply survivor health effects
  const affectedSurvivors = [];
  for (const survivor of survivors) {
    const base = bases.find(b => b.id === survivor.base_id);
    if (!base?.sector) continue;

    const wx = weatherMap[base.sector];
    if (!wx?.hazard || !wx.survivor_effects) continue;

    // Only affect outdoor workers
    const outdoorTasks = ["scavenge", "farm", "patrol", "defend"];
    if (!outdoorTasks.includes(survivor.current_task)) continue;

    // Chance to be affected (severity-based)
    if (Math.random() > wx.severity * 0.2) continue;

    const update = {};
    if (wx.survivor_effects.health && survivor.health === "healthy") {
      update.health = wx.survivor_effects.health;
    }
    if (wx.survivor_effects.stress_add) {
      update.stress = Math.min(100, (survivor.stress || 20) + wx.survivor_effects.stress_add);
    }
    if (wx.survivor_effects.rest_drain) {
      update.rest = Math.max(0, (survivor.rest || 70) - wx.survivor_effects.rest_drain);
    }

    if (Object.keys(update).length > 0) {
      await base44.asServiceRole.entities.Survivor.update(survivor.id, update);
      affectedSurvivors.push({
        name: survivor.name,
        sector: base.sector,
        hazard: wx.label,
        effects: update,
      });
    }
  }

  return Response.json({
    status: "ok",
    colony_effects: colonyEffects,
    affected_bases: affectedBases,
    affected_survivors: affectedSurvivors,
  });
}

async function handleGetWeatherMap(base44) {
  // Returns the last simulated weather — stored in WorldConditions special_conditions
  const wc = await base44.asServiceRole.entities.WorldConditions.list("-updated_date", 1).then(r => r[0] || null);
  return Response.json({
    status: "ok",
    world_conditions: wc,
  });
}
