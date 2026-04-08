import { deterministicBoolean, deterministicNumber, stableHash } from './deterministic.ts';

export const HAZARD_TYPES: Record<string, any> = {
  acid_rain: {
    label: 'Acid Rain',
    color: '#7cfc00',
    icon: 'cloud-rain',
    effects: { medical: -5, water: -3, morale: -3 },
    survivor_effects: { health: 'sick', stress_add: 10, rest_drain: 5 },
    severity_range: [1, 4],
    seasons: ['autumn', 'nuclear_winter', 'monsoon'],
    weather_triggers: ['rain', 'heavy_rain', 'acid_rain', 'thunderstorm'],
  },
  dust_storm: {
    label: 'Dust Storm',
    color: '#d4a13a',
    icon: 'wind',
    effects: { food: -4, power: -6, defense: -3 },
    survivor_effects: { health: 'injured', stress_add: 15, rest_drain: 10 },
    severity_range: [2, 5],
    seasons: ['summer', 'dry_season', 'autumn'],
    weather_triggers: ['dust_storm', 'ashfall', 'strong_wind'],
  },
  freezing_cold: {
    label: 'Freezing Cold',
    color: '#5ba8c8',
    icon: 'snowflake',
    effects: { food: -6, power: -8, morale: -5 },
    survivor_effects: { health: 'sick', stress_add: 12, rest_drain: 15 },
    severity_range: [1, 5],
    seasons: ['winter', 'nuclear_winter'],
    weather_triggers: ['snow', 'blizzard'],
  },
  radiation_storm: {
    label: 'Radiation Storm',
    color: '#c53030',
    icon: 'zap',
    effects: { medical: -8, food: -3, morale: -8 },
    survivor_effects: { health: 'critical', stress_add: 25, rest_drain: 20 },
    severity_range: [3, 5],
    seasons: ['nuclear_winter'],
    weather_triggers: ['radiation_storm'],
  },
  toxic_fog: {
    label: 'Toxic Fog',
    color: '#9b59b6',
    icon: 'cloud',
    effects: { medical: -4, food: -2, defense: -2 },
    survivor_effects: { health: 'sick', stress_add: 8, rest_drain: 8 },
    severity_range: [1, 3],
    seasons: ['autumn', 'monsoon', 'spring'],
    weather_triggers: ['fog', 'ashfall', 'overcast'],
  },
  heatwave: {
    label: 'Heatwave',
    color: '#e74c3c',
    icon: 'thermometer',
    effects: { water: -8, food: -4, morale: -4 },
    survivor_effects: { health: 'sick', stress_add: 10, rest_drain: 12 },
    severity_range: [2, 4],
    seasons: ['summer', 'dry_season'],
    weather_triggers: ['clear'],
  },
};

const ROWS = ['A', 'B', 'C', 'D', 'E'];
const COLS = [1, 2, 3, 4, 5];

export const getAllSectors = () => {
  const sectors: string[] = [];
  for (const row of ROWS) {
    for (const col of COLS) {
      sectors.push(`${row}-${col}`);
    }
  }
  return sectors;
};

const THREAT_BONUS: Record<string, number> = {
  minimal: 0,
  low: 0.03,
  moderate: 0.08,
  high: 0.14,
  critical: 0.2,
};

const WEATHER_BONUS: Record<string, number> = {
  radiation_storm: 0.15,
  acid_rain: 0.12,
  dust_storm: 0.1,
  blizzard: 0.12,
  thunderstorm: 0.09,
  heavy_rain: 0.06,
  ashfall: 0.08,
  fog: 0.03,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const scoreHazard = (hazardKey: string, hazard: any, worldConditions: any, territory: any, cycleKey: string) => {
  const season = String(worldConditions?.season || 'autumn');
  const weather = String(worldConditions?.weather || 'overcast');
  const temp = Number(worldConditions?.temperature_c ?? 15);
  const radiation = String(worldConditions?.radiation_level || 'safe').toLowerCase();
  const threat = String(territory?.threat_level || 'minimal');

  let score = stableHash('weather-hazard-score', cycleKey, territory?.sector || 'open', hazardKey) % 12;
  if (hazard.seasons.includes(season)) score += 30;
  if (hazard.weather_triggers.includes(weather)) score += 25;
  if (hazardKey === 'freezing_cold' && temp <= 0) score += 18;
  if (hazardKey === 'heatwave' && temp >= 32) score += 18;
  if (hazardKey === 'radiation_storm' && ['high', 'lethal'].includes(radiation)) score += 30;
  if (hazardKey === 'dust_storm' && temp >= 24) score += 10;
  score += Math.round((THREAT_BONUS[threat] || 0) * 100);
  return score;
};

const buildClearSector = () => ({
  hazard: null,
  severity: 0,
  label: 'Clear',
  color: null,
  icon: null,
  effects: {},
  description: 'No hazardous conditions',
});

export const buildWeatherMap = ({
  worldConditions,
  territories,
  hazardCoverage = 0.35,
  cycleKey,
}: {
  worldConditions: any;
  territories: any[];
  hazardCoverage?: number;
  cycleKey: string;
}) => {
  const sectors = getAllSectors();
  const weatherMap: Record<string, any> = {};
  const normalizedCoverage = clamp(Number(hazardCoverage) || 0.35, 0.05, 0.9);

  for (const sector of sectors) {
    const territory = territories.find((entry) => entry?.sector === sector) || null;
    const weather = String(worldConditions?.weather || 'overcast');
    const season = String(worldConditions?.season || 'autumn');
    const pressure = clamp(
      normalizedCoverage + (THREAT_BONUS[String(territory?.threat_level || 'minimal')] || 0) + (WEATHER_BONUS[weather] || 0),
      0.05,
      0.95,
    );

    const hasHazard = deterministicBoolean(pressure, 'weather-presence', cycleKey, sector, season, weather);
    if (!hasHazard) {
      weatherMap[sector] = buildClearSector();
      continue;
    }

    const candidates = Object.entries(HAZARD_TYPES)
      .map(([hazardKey, hazard]) => ({
        hazardKey,
        hazard,
        score: scoreHazard(hazardKey, hazard, worldConditions, territory, cycleKey),
      }))
      .sort((left, right) => right.score - left.score);

    const winner = candidates[0];
    if (!winner || winner.score < 30) {
      weatherMap[sector] = buildClearSector();
      continue;
    }

    const [minSeverity, maxSeverity] = winner.hazard.severity_range;
    const severityBoost = String(territory?.threat_level || 'minimal') === 'critical' ? 1 : 0;
    const severity = clamp(
      deterministicNumber(minSeverity, maxSeverity, 'weather-severity', cycleKey, sector, winner.hazardKey) + severityBoost,
      minSeverity,
      5,
    );

    const scaledEffects = Object.fromEntries(
      Object.entries(winner.hazard.effects).map(([resource, value]) => [resource, Math.round(Number(value) * (severity / 3))]),
    );

    weatherMap[sector] = {
      hazard: winner.hazardKey,
      severity,
      label: winner.hazard.label,
      color: winner.hazard.color,
      icon: winner.hazard.icon,
      effects: scaledEffects,
      survivor_effects: winner.hazard.survivor_effects,
      description: `${winner.hazard.label} (Severity ${severity}/5)`,
      source_ref: `Weather:${cycleKey}#${sector}`,
    };
  }

  weatherMap.__meta = {
    cycle_key: cycleKey,
    generated_at: new Date().toISOString(),
    weather: String(worldConditions?.weather || 'overcast'),
    season: String(worldConditions?.season || 'autumn'),
    source_ref: `Weather:${cycleKey}`,
  };

  return weatherMap;
};

export const buildWeatherBulletin = (weatherMap: Record<string, any>, worldConditions: any) => {
  const hazardEntries = Object.entries(weatherMap).filter(([sector, data]) => sector !== '__meta' && data?.hazard);
  if (hazardEntries.length === 0) {
    return 'Regional sweep clear. No major hazard fronts are moving across the grid right now.';
  }

  const grouped = new Map<string, string[]>();
  for (const [sector, data] of hazardEntries) {
    const key = `${data.label}|${data.severity}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(sector);
  }

  const summaries = [...grouped.entries()].slice(0, 3).map(([key, sectors]) => {
    const [label, severity] = key.split('|');
    return `${label} severity ${severity} over ${sectors.join(', ')}`;
  });

  return `Weather watch for ${String(worldConditions?.season || 'unknown season')}: ${summaries.join('; ')}. Current atmospheric pattern remains ${String(worldConditions?.weather || 'unstable')}, so exposed teams should assume conditions will worsen before they break.`;
};

export const isOutdoorTask = (task: unknown) => ['scavenge', 'farm', 'patrol', 'defend'].includes(String(task || ''));

export const shouldApplyWeatherToSurvivor = ({
  survivor,
  weather,
  cycleKey,
}: {
  survivor: any;
  weather: any;
  cycleKey: string;
}) => deterministicBoolean(
  clamp((Number(weather?.severity || 0) * 0.2) + 0.05, 0.05, 0.95),
  'weather-survivor-effect',
  cycleKey,
  survivor?.id,
  weather?.hazard,
  weather?.severity,
);
