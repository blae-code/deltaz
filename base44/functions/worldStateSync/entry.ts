import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';
import { requireAdminOrServiceRole } from '../_shared/trustedInvocation.ts';

const WORLD_STATE_STALE_AFTER_SECONDS = 180;
const VALID_SEASONS = new Set(['spring', 'summer', 'autumn', 'winter', 'nuclear_winter', 'dry_season', 'monsoon']);
const VALID_WEATHER = new Set(['clear', 'overcast', 'fog', 'rain', 'heavy_rain', 'thunderstorm', 'snow', 'blizzard', 'dust_storm', 'ashfall', 'acid_rain', 'radiation_storm']);
const VALID_DAYLIGHT = new Set(['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night', 'midnight']);
const VALID_VISIBILITY = new Set(['excellent', 'good', 'reduced', 'poor', 'zero']);
const VALID_RADIATION = new Set(['safe', 'low', 'moderate', 'high', 'lethal']);
const VALID_WIND = new Set(['calm', 'light', 'moderate', 'strong', 'gale']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  try {
    const auth = await requireAdminOrServiceRole(req, base44, 'Forbidden: Admin or trusted automation required for world-state sync.');
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const action = sanitizeText(body?.action, 40) || 'status';

    if (action === 'pull') {
      return await handlePull(base44);
    }

    if (action === 'status') {
      return await handleStatus(base44);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('worldStateSync error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});

async function handleStatus(base44: any) {
  const current = await getCurrentWorldConditions(base44);
  const sourceConfig = getWorldStateSourceConfig();

  return Response.json({
    status: 'ok',
    configured: Boolean(sourceConfig),
    source_kind: sourceConfig?.kind || null,
    source_ref: sourceConfig?.ref || null,
    authority_status: getEffectiveAuthorityStatus(current),
    last_verified_at: sanitizeText(current?.last_verified_at, 40) || null,
    last_sync_attempt_at: sanitizeText(current?.last_sync_attempt_at, 40) || null,
    last_sync_error: sanitizeText(current?.last_sync_error, 400) || null,
    world_conditions: current,
  });
}

async function handlePull(base44: any) {
  const current = await getCurrentWorldConditions(base44);
  const sourceConfig = getWorldStateSourceConfig();
  const nowIso = new Date().toISOString();

  if (!sourceConfig) {
    const persisted = await persistSyncFailure(base44, current, {
      nowIso,
      sourceKind: '',
      sourceRef: '',
      errorMessage: 'WORLD_STATE_FILE_PATH or WORLD_STATE_RCON_COMMAND must be configured.',
      unavailable: true,
    });

    return Response.json({
      status: 'error',
      authority_status: getEffectiveAuthorityStatus(persisted),
      error: persisted?.last_sync_error || 'World state source is unavailable.',
      world_conditions: persisted,
    }, { status: 503 });
  }

  try {
    const rawPayload = sourceConfig.kind === 'pterodactyl_file'
      ? await readWorldStateFile(sourceConfig.ref)
      : await readWorldStateRcon(sourceConfig.ref);

    const normalized = normalizeWorldPayload(rawPayload);
    const nextWorldConditions = withProvenance({
      ...normalized,
      authority_status: 'verified',
      authoritative_source_kind: sourceConfig.kind,
      authoritative_source_ref: sourceConfig.ref,
      last_verified_at: nowIso,
      last_sync_attempt_at: nowIso,
      last_sync_error: '',
      stale_after_seconds: WORLD_STATE_STALE_AFTER_SECONDS,
      clock_observed_at: nowIso,
    }, {
      dataOrigin: DATA_ORIGINS.SERVER_TELEMETRY,
      sourceRefs: [
        buildSourceRef('WorldStateSource', sourceConfig.kind, sourceConfig.ref),
      ],
    });

    const changed = hasWorldSnapshotChanged(current, nextWorldConditions);
    const persisted = await saveWorldConditions(base44, current, nextWorldConditions);

    return Response.json({
      status: 'ok',
      changed,
      authority_status: 'verified',
      world_conditions: persisted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'World state pull failed.';
    const persisted = await persistSyncFailure(base44, current, {
      nowIso,
      sourceKind: sourceConfig.kind,
      sourceRef: sourceConfig.ref,
      errorMessage: message,
      unavailable: false,
    });

    return Response.json({
      status: 'error',
      authority_status: getEffectiveAuthorityStatus(persisted),
      error: message,
      world_conditions: persisted,
    }, { status: 502 });
  }
}

async function getCurrentWorldConditions(base44: any) {
  const rows = await base44.asServiceRole.entities.WorldConditions.list('-updated_date', 1).catch(() => []);
  return rows[0] || null;
}

function getWorldStateSourceConfig() {
  const filePath = normalizeFilePath(Deno.env.get('WORLD_STATE_FILE_PATH') || '');
  if (filePath) {
    return { kind: 'pterodactyl_file', ref: filePath } as const;
  }

  const rconCommand = sanitizeCommand(Deno.env.get('WORLD_STATE_RCON_COMMAND') || '');
  if (rconCommand) {
    return { kind: 'rcon_command', ref: rconCommand } as const;
  }

  return null;
}

async function persistSyncFailure(
  base44: any,
  current: any,
  {
    nowIso,
    sourceKind,
    sourceRef,
    errorMessage,
    unavailable,
  }: {
    nowIso: string;
    sourceKind: string;
    sourceRef: string;
    errorMessage: string;
    unavailable: boolean;
  },
) {
  const failureStatus = unavailable
    ? (current?.last_verified_at ? resolveFailureStatus(current) : 'unavailable')
    : resolveFailureStatus(current);

  const payload = {
    authority_status: failureStatus,
    authoritative_source_kind: sourceKind || current?.authoritative_source_kind || undefined,
    authoritative_source_ref: sourceRef || sanitizeText(current?.authoritative_source_ref, 240),
    last_sync_attempt_at: nowIso,
    last_sync_error: sanitizeText(errorMessage, 500),
    stale_after_seconds: clampInteger(current?.stale_after_seconds, 30, 3600, WORLD_STATE_STALE_AFTER_SECONDS),
  };

  return await saveWorldConditions(base44, current, payload);
}

function resolveFailureStatus(current: any) {
  if (!current?.last_verified_at) {
    return 'error';
  }

  return isWorldStateFresh(current) ? 'error' : 'stale';
}

function isWorldStateFresh(current: any, nowMs = Date.now()) {
  const lastVerifiedMs = parseTimestamp(current?.last_verified_at);
  if (!Number.isFinite(lastVerifiedMs)) {
    return false;
  }

  const staleAfterSeconds = clampInteger(current?.stale_after_seconds, 30, 3600, WORLD_STATE_STALE_AFTER_SECONDS);
  return (nowMs - lastVerifiedMs) <= (staleAfterSeconds * 1000);
}

function getEffectiveAuthorityStatus(current: any) {
  if (!current) {
    return 'unavailable';
  }

  const recorded = sanitizeText(current.authority_status, 24);
  if (recorded === 'verified' && !isWorldStateFresh(current)) {
    return 'stale';
  }
  if (recorded === 'error' && !isWorldStateFresh(current) && current?.last_verified_at) {
    return 'stale';
  }
  if (recorded) {
    return recorded;
  }
  if (current?.last_verified_at) {
    return isWorldStateFresh(current) ? 'verified' : 'stale';
  }

  return 'unavailable';
}

async function saveWorldConditions(base44: any, current: any, payload: Record<string, unknown>) {
  if (current?.id) {
    await base44.asServiceRole.entities.WorldConditions.update(current.id, payload);
    const refreshed = await base44.asServiceRole.entities.WorldConditions.filter({ id: current.id });
    return refreshed[0] || null;
  }

  return await base44.asServiceRole.entities.WorldConditions.create(payload);
}

async function readWorldStateFile(filePath: string) {
  const ptero = getPterodactylConfig();
  const encodedPath = encodeURIComponent(filePath);

  let response = await fetch(
    `${ptero.url}/api/client/servers/${ptero.serverId}/files/contents?file=${encodedPath}`,
    {
      method: 'GET',
      headers: ptero.headers,
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (response.status === 405) {
    response = await fetch(
      `${ptero.url}/api/client/servers/${ptero.serverId}/files/contents?file=${encodedPath}`,
      {
        method: 'POST',
        headers: ptero.headers,
        signal: AbortSignal.timeout(10_000),
      },
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read world state file (${response.status}): ${text || 'No response body'}`);
  }

  return await response.text();
}

async function readWorldStateRcon(command: string) {
  return await sendRconCommand(command);
}

function getPterodactylConfig() {
  const url = (Deno.env.get('PTERODACTYL_URL') || '').replace(/\/+$/, '');
  const apiKey = Deno.env.get('PTERODACTYL_API_KEY') || '';
  const serverId = Deno.env.get('PTERODACTYL_SERVER_ID') || '';

  if (!url || !apiKey || !serverId) {
    throw new Error('Missing Pterodactyl configuration.');
  }

  return {
    url,
    serverId,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  };
}

function getRconConfig() {
  const host = Deno.env.get('GAME_SERVER_IP') || '';
  const password = Deno.env.get('RCON_PASSWORD') || '';
  const port = Number.parseInt(Deno.env.get('RCON_PORT') || '0', 10);

  if (!host || !password || !Number.isInteger(port) || port <= 0) {
    throw new Error('Missing RCON configuration.');
  }

  return { host, port, password };
}

async function sendRconCommand(command: string) {
  const { host, port, password } = getRconConfig();
  const conn = await Deno.connect({ hostname: host, port });

  try {
    await conn.write(buildPacket(1, 3, password));
    const authResp = new Uint8Array(4096);
    const authBytesRead = await conn.read(authResp);
    if (authBytesRead === null || authBytesRead < 12) {
      throw new Error('RCON authentication failed.');
    }
    const authResult = decodePacket(authResp.slice(0, authBytesRead));
    if (authResult.id === -1) {
      throw new Error('RCON authentication failed.');
    }

    await conn.write(buildPacket(2, 2, command));
    const cmdResp = new Uint8Array(16_384);
    const bytesRead = await conn.read(cmdResp);
    if (bytesRead === null) {
      throw new Error('RCON command returned no data.');
    }

    return decodePacket(cmdResp.slice(0, bytesRead)).body;
  } finally {
    conn.close();
  }
}

function buildPacket(id: number, type: number, body: string) {
  const bodyBuf = new TextEncoder().encode(body);
  const size = 4 + 4 + bodyBuf.length + 2;
  const buf = new Uint8Array(4 + size);
  const view = new DataView(buf.buffer);
  view.setInt32(0, size, true);
  view.setInt32(4, id, true);
  view.setInt32(8, type, true);
  buf.set(bodyBuf, 12);
  buf[12 + bodyBuf.length] = 0;
  buf[13 + bodyBuf.length] = 0;
  return buf;
}

function decodePacket(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset);
  const size = view.getInt32(0, true);
  const id = view.getInt32(4, true);
  const type = view.getInt32(8, true);
  const body = new TextDecoder().decode(data.slice(12, 4 + size - 2));
  return { size, id, type, body };
}

function normalizeWorldPayload(rawPayload: string) {
  const text = rawPayload.replace(/^\uFEFF/, '').trim();
  if (!text) {
    throw new Error('World state source returned an empty payload.');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('World state source did not return valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('World state payload must be a JSON object.');
  }

  const rawDayNumber = toRequiredInteger(parsed.world_day_number, 'world_day_number');
  const rawMinuteOfDay = toRequiredInteger(parsed.world_minute_of_day, 'world_minute_of_day');
  const minuteCarry = Math.floor(rawMinuteOfDay / 1440);
  const worldMinuteOfDay = ((rawMinuteOfDay % 1440) + 1440) % 1440;
  const worldDayNumber = Math.max(0, rawDayNumber + minuteCarry);
  const clockRateMultiplier = toRequiredNumber(parsed.clock_rate_multiplier, 'clock_rate_multiplier');
  if (clockRateMultiplier <= 0 || clockRateMultiplier > 86_400) {
    throw new Error('clock_rate_multiplier must be greater than 0 and less than or equal to 86400.');
  }

  const season = validateEnumValue(parsed.season, VALID_SEASONS, 'season');
  const weather = validateEnumValue(parsed.weather, VALID_WEATHER, 'weather');
  const daylightPhase = validateEnumValue(parsed.daylight_phase, VALID_DAYLIGHT, 'daylight_phase');

  const payload: Record<string, unknown> = {
    world_day_number: worldDayNumber,
    world_minute_of_day: worldMinuteOfDay,
    clock_rate_multiplier: clockRateMultiplier,
    world_date: `Day ${worldDayNumber}`,
    world_time: formatMinuteOfDay(worldMinuteOfDay),
    season,
    weather,
    daylight_phase: daylightPhase,
  };

  const temperature = toOptionalNumber(parsed.temperature_c);
  if (temperature !== null) {
    payload.temperature_c = temperature;
  }

  const visibility = sanitizeText(parsed.visibility, 40);
  if (visibility && VALID_VISIBILITY.has(visibility)) {
    payload.visibility = visibility;
  }

  const radiationLevel = sanitizeText(parsed.radiation_level, 40);
  if (radiationLevel && VALID_RADIATION.has(radiationLevel)) {
    payload.radiation_level = radiationLevel;
  }

  const wind = sanitizeText(parsed.wind, 40);
  if (wind && VALID_WIND.has(wind)) {
    payload.wind = wind;
  }

  const specialConditions = Array.isArray(parsed.special_conditions)
    ? parsed.special_conditions.map((value) => sanitizeText(value, 80)).filter(Boolean).slice(0, 12)
    : [];
  if (specialConditions.length > 0) {
    payload.special_conditions = specialConditions;
  }

  const flavorText = sanitizeText(parsed.gm_flavor_text, 400);
  if (flavorText) {
    payload.gm_flavor_text = flavorText;
  }

  return payload;
}

function hasWorldSnapshotChanged(current: any, nextPayload: Record<string, unknown>) {
  const keysToCompare = [
    'world_day_number',
    'world_minute_of_day',
    'clock_rate_multiplier',
    'season',
    'weather',
    'daylight_phase',
    'temperature_c',
    'visibility',
    'radiation_level',
    'wind',
    'world_date',
    'world_time',
    'authoritative_source_kind',
    'authoritative_source_ref',
  ];

  return keysToCompare.some((key) => serializeComparable(current?.[key]) !== serializeComparable(nextPayload[key]));
}

function serializeComparable(value: unknown) {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function validateEnumValue(value: unknown, validValues: Set<string>, fieldName: string) {
  const normalized = sanitizeText(value, 80);
  if (!normalized || !validValues.has(normalized)) {
    throw new Error(`Invalid ${fieldName} value "${normalized || 'unknown'}".`);
  }
  return normalized;
}

function toRequiredInteger(value: unknown, fieldName: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a number.`);
  }
  return Math.trunc(numeric);
}

function toRequiredNumber(value: unknown, fieldName: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }
  return numeric;
}

function toOptionalNumber(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.round(numeric * 10) / 10;
}

function formatMinuteOfDay(minuteOfDay: number) {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeFilePath(value: string) {
  const sanitized = value.replace(/\\/g, '/').trim();
  if (!sanitized) {
    return '';
  }

  return sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
}

function sanitizeCommand(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 300);
}

function sanitizeText(value: unknown, maxLength = 160) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function parseTimestamp(value: unknown) {
  const text = sanitizeText(value, 40);
  if (!text) {
    return NaN;
  }

  return new Date(text).getTime();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
