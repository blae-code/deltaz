const DEFAULT_STALE_AFTER_SECONDS = 180;

export const WORLD_AUTHORITY_LABELS = {
  verified: "Live",
  stale: "Stale",
  unavailable: "Offline",
  error: "Error",
};

export const WORLD_SOURCE_LABELS = {
  pterodactyl_file: "Server Snapshot",
  rcon_command: "RCON Snapshot",
};

export const WORLD_SEASON_LABELS = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
  nuclear_winter: "Nuclear Winter",
  dry_season: "Dry Season",
  monsoon: "Monsoon",
};

export const WORLD_DAYLIGHT_LABELS = {
  dawn: "Dawn",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  dusk: "Dusk",
  night: "Night",
  midnight: "Midnight",
};

export const WORLD_WEATHER_LABELS = {
  clear: "Clear Skies",
  overcast: "Overcast",
  fog: "Dense Fog",
  rain: "Rain",
  heavy_rain: "Heavy Rain",
  thunderstorm: "Thunderstorm",
  snow: "Snow",
  blizzard: "Blizzard",
  dust_storm: "Dust Storm",
  ashfall: "Ashfall",
  acid_rain: "Acid Rain",
  radiation_storm: "Radiation Storm",
};

export function getStaleAfterSeconds(conditions) {
  return clampInteger(conditions?.stale_after_seconds, 30, 3600, DEFAULT_STALE_AFTER_SECONDS);
}

export function getWorldAgeSeconds(conditions, now = Date.now()) {
  const lastVerifiedAtMs = parseTimestamp(conditions?.last_verified_at);
  if (!Number.isFinite(lastVerifiedAtMs)) {
    return null;
  }

  return Math.max(0, Math.round((now - lastVerifiedAtMs) / 1000));
}

export function getEffectiveAuthorityStatus(conditions, now = Date.now()) {
  if (!conditions) {
    return "unavailable";
  }

  const recorded = sanitizeText(conditions.authority_status, 24);
  const ageSeconds = getWorldAgeSeconds(conditions, now);
  const isFresh = ageSeconds !== null && ageSeconds <= getStaleAfterSeconds(conditions);

  if (recorded === "verified" && !isFresh) {
    return "stale";
  }

  if (recorded === "error" && conditions.last_verified_at && !isFresh) {
    return "stale";
  }

  if (recorded) {
    return recorded;
  }

  if (conditions.last_verified_at) {
    return isFresh ? "verified" : "stale";
  }

  return "unavailable";
}

export function buildWorldClockSnapshot(conditions, now = Date.now()) {
  const authorityStatus = getEffectiveAuthorityStatus(conditions, now);
  const worldDayNumber = toInteger(conditions?.world_day_number);
  const worldMinuteOfDay = toInteger(conditions?.world_minute_of_day);
  const clockObservedAtMs = parseTimestamp(conditions?.clock_observed_at || conditions?.last_verified_at);
  const clockRateMultiplier = toNumber(conditions?.clock_rate_multiplier, 1);
  const ageSeconds = getWorldAgeSeconds(conditions, now);
  const isTicking = authorityStatus === "verified"
    && Number.isFinite(worldDayNumber)
    && Number.isFinite(worldMinuteOfDay)
    && Number.isFinite(clockObservedAtMs)
    && clockRateMultiplier > 0;

  let absoluteSeconds = Number.isFinite(worldDayNumber) && Number.isFinite(worldMinuteOfDay)
    ? (worldDayNumber * 86400) + (worldMinuteOfDay * 60)
    : NaN;

  if (isTicking) {
    absoluteSeconds += Math.max(0, Math.floor(((now - clockObservedAtMs) / 1000) * clockRateMultiplier));
  }

  const resolvedDayNumber = Number.isFinite(absoluteSeconds)
    ? Math.floor(absoluteSeconds / 86400)
    : (Number.isFinite(worldDayNumber) ? worldDayNumber : null);
  const secondsOfDay = Number.isFinite(absoluteSeconds)
    ? positiveModulo(absoluteSeconds, 86400)
    : (Number.isFinite(worldMinuteOfDay) ? (worldMinuteOfDay * 60) : null);

  return {
    authorityStatus,
    authorityLabel: WORLD_AUTHORITY_LABELS[authorityStatus] || "Offline",
    sourceLabel: WORLD_SOURCE_LABELS[sanitizeText(conditions?.authoritative_source_kind, 40)] || "Telemetry Offline",
    sourceRef: sanitizeText(conditions?.authoritative_source_ref, 240) || "",
    seasonKey: sanitizeText(conditions?.season, 40),
    seasonLabel: WORLD_SEASON_LABELS[sanitizeText(conditions?.season, 40)] || "--",
    weatherKey: sanitizeText(conditions?.weather, 40),
    weatherLabel: WORLD_WEATHER_LABELS[sanitizeText(conditions?.weather, 40)] || "--",
    daylightKey: sanitizeText(conditions?.daylight_phase, 40),
    daylightLabel: WORLD_DAYLIGHT_LABELS[sanitizeText(conditions?.daylight_phase, 40)] || "--",
    displayDate: sanitizeText(conditions?.world_date, 120) || (resolvedDayNumber !== null ? `Day ${resolvedDayNumber}` : "--"),
    displayTime: secondsOfDay !== null ? formatClock(secondsOfDay, false) : (sanitizeText(conditions?.world_time, 32) || "--:--"),
    displayTimeWithSeconds: secondsOfDay !== null ? formatClock(secondsOfDay, true) : (sanitizeText(conditions?.world_time, 32) || "--:--"),
    dayNumber: resolvedDayNumber,
    minuteOfDay: secondsOfDay !== null ? Math.floor(secondsOfDay / 60) : (Number.isFinite(worldMinuteOfDay) ? worldMinuteOfDay : null),
    secondsOfDay,
    clockRateMultiplier,
    isTicking,
    ageSeconds,
    freshnessLabel: ageSeconds === null ? "No verified sample" : formatAge(ageSeconds),
    freshnessTooltip: ageSeconds === null ? "No verified world snapshot has been received." : `Last verified ${formatAgeLong(ageSeconds)} ago.`,
    lastVerifiedAt: sanitizeText(conditions?.last_verified_at, 40) || "",
    lastSyncAttemptAt: sanitizeText(conditions?.last_sync_attempt_at, 40) || "",
    lastSyncError: sanitizeText(conditions?.last_sync_error, 500) || "",
  };
}

export function getAuthorityTone(status) {
  if (status === "verified") return "ok";
  if (status === "stale") return "warn";
  if (status === "error") return "error";
  return "offline";
}

export function formatAge(ageSeconds) {
  if (ageSeconds < 5) return "just now";
  if (ageSeconds < 60) return `${ageSeconds}s`;
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function formatAgeLong(ageSeconds) {
  if (ageSeconds < 5) return "moments";
  if (ageSeconds < 60) return `${ageSeconds} seconds`;
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  if (!remainderMinutes) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"} ${remainderMinutes} minute${remainderMinutes === 1 ? "" : "s"}`;
}

function formatClock(secondsOfDay, withSeconds) {
  const hours = Math.floor(secondsOfDay / 3600);
  const minutes = Math.floor((secondsOfDay % 3600) / 60);
  const seconds = secondsOfDay % 60;
  if (withSeconds) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function parseTimestamp(value) {
  const text = sanitizeText(value, 40);
  if (!text) {
    return NaN;
  }

  return new Date(text).getTime();
}

function toInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return NaN;
  }
  return Math.trunc(numeric);
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
}

function clampInteger(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function sanitizeText(value, maxLength = 160) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
