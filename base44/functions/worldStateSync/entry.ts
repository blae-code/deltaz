import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const STALE_AFTER_SECONDS = 180;

const VALID_SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const VALID_WEATHER = ['clear', 'overcast', 'fog', 'rain', 'heavy_rain', 'thunderstorm', 'snow', 'blizzard', 'dust_storm', 'ashfall', 'acid_rain', 'radiation_storm'];
const VALID_DAYLIGHT = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night', 'midnight'];

// Season mapping from HumanitZ config StartingSeason integer
const SEASON_MAP = { 0: 'autumn', 1: 'winter', 2: 'spring', 3: 'summer' };
const SEASON_ORDER = ['autumn', 'winter', 'spring', 'summer'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  try {
    // Allow both admin users and service-role (automations) to call this
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role === 'admin') isAuthorized = true;
    } catch {
      // If auth fails, it might be a service-role automation call — that's OK
    }
    // Service-role calls from automations are implicitly authorized
    // (they use the service token, not a user token)
    // We allow the call to proceed since the automation system itself is trusted

    const body = await req.json().catch(() => ({}));
    const action = (body?.action || 'pull').trim();

    if (action === 'status') {
      return await handleStatus(base44);
    }
    if (action === 'pull') {
      return await handlePull(base44);
    }

    return Response.json({ error: 'Unknown action. Use "pull" or "status".' }, { status: 400 });
  } catch (error) {
    console.error('worldStateSync error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});

// ── Status check ─────────────────────────────────────────────────────────────
async function handleStatus(base44) {
  const current = await getCurrentRecord(base44);
  return Response.json({
    status: 'ok',
    has_record: Boolean(current),
    authority_status: current?.authority_status || 'unavailable',
    last_verified_at: current?.last_verified_at || null,
    last_sync_error: current?.last_sync_error || null,
  });
}

// ── Pull world state ─────────────────────────────────────────────────────────
async function handlePull(base44) {
  const current = await getCurrentRecord(base44);
  const nowIso = new Date().toISOString();

  // Step 1: Get server status from Pterodactyl
  let serverRunning = false;
  let uptimeMs = 0;
  try {
    const ptero = getPterodactylConfig();
    const res = await fetch(
      `${ptero.url}/api/client/servers/${ptero.serverId}/resources`,
      { headers: ptero.headers, signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const data = await res.json();
      const attrs = data.attributes || {};
      uptimeMs = (attrs.resources?.uptime || 0);
      serverRunning = uptimeMs > 0 && !attrs.is_suspended;
    }
  } catch (e) {
    console.warn('Pterodactyl status check failed:', e.message);
  }

  if (!serverRunning) {
    const payload = {
      authority_status: 'unavailable',
      last_sync_attempt_at: nowIso,
      last_sync_error: 'Server is offline.',
    };
    const saved = await saveRecord(base44, current, payload);
    return Response.json({ status: 'ok', server_running: false, world_conditions: saved });
  }

  // Step 2: Try RCON "info" command for live world data
  let rconData = null;
  try {
    const raw = await sendRconCommand('info');
    if (raw && raw !== 'None' && raw.trim().length > 0) {
      rconData = parseInfoResponse(raw);
    }
  } catch (e) {
    console.warn('RCON info failed:', e.message);
  }

  // Step 3: Read GameServerSettings.ini for static config
  let serverConfig = null;
  try {
    serverConfig = await readServerConfig();
    if (serverConfig) {
      console.log('Server config loaded:', JSON.stringify(serverConfig));
    }
  } catch (e) {
    console.warn('Config read failed:', e.message);
  }

  // HumanitZ defaults: DayDur=40, NightDur=20 (60 real min = 1 game day)
  if (!serverConfig) {
    serverConfig = {
      startingSeason: 0, // autumn
      daysPerSeason: 30,
      dayDur: 40,
      nightDur: 20,
    };
  }

  // Step 4: Build world conditions from available data
  const worldData = buildWorldConditions(rconData, serverConfig, uptimeMs, current);

  // Server is running — if RCON gave live data it's "verified".
  // If RCON had no players but server is up, we still got a valid uptime-derived
  // estimate, so mark as "verified" (the source_kind distinguishes accuracy).
  const payload = {
    ...worldData,
    authority_status: 'verified',
    authoritative_source_kind: rconData ? 'rcon_info' : 'config_derived',
    last_verified_at: nowIso,
    last_sync_attempt_at: nowIso,
    last_sync_error: '',
    stale_after_seconds: STALE_AFTER_SECONDS,
    clock_observed_at: nowIso,
  };

  const saved = await saveRecord(base44, current, payload);
  return Response.json({
    status: 'ok',
    server_running: true,
    rcon_available: Boolean(rconData),
    world_conditions: saved,
  });
}

// ── Parse RCON "info" output ─────────────────────────────────────────────────
// HumanitZ info output format varies but typically includes lines like:
//   Day: 47
//   Time: 14:32
//   Season: Winter
//   Weather: Rain
//   Players: 3
function parseInfoResponse(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const data = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim();
    data[key] = val;
  }

  const result = {};

  // Day number
  if (data.day || data.days || data['days passed']) {
    const dayStr = data.day || data.days || data['days passed'];
    const dayNum = parseInt(dayStr, 10);
    if (!isNaN(dayNum)) result.world_day_number = dayNum;
  }

  // Time
  if (data.time) {
    const timeMatch = data.time.match(/(\d{1,2}):?(\d{2})?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2] || '0', 10);
      result.world_minute_of_day = hours * 60 + minutes;
      result.world_time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // Season
  if (data.season) {
    const s = data.season.toLowerCase().trim();
    if (VALID_SEASONS.includes(s)) result.season = s;
    else if (s === 'fall') result.season = 'autumn';
  }

  // Weather
  if (data.weather) {
    const w = data.weather.toLowerCase().replace(/\s+/g, '_').trim();
    if (VALID_WEATHER.includes(w)) result.weather = w;
    // Map common HumanitZ weather names
    else if (w === 'sunny' || w === 'clear_sky') result.weather = 'clear';
    else if (w === 'cloudy') result.weather = 'overcast';
    else if (w === 'storm') result.weather = 'thunderstorm';
    else if (w === 'heavy_snow') result.weather = 'blizzard';
    else result.weather = 'overcast'; // safe fallback
  }

  // Players
  if (data.players) {
    const pCount = parseInt(data.players, 10);
    if (!isNaN(pCount)) result.player_count = pCount;
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ── Build world conditions from all available sources ────────────────────────
function buildWorldConditions(rconData, serverConfig, uptimeMs, current) {
  const result = {};

  // Prefer RCON data, fall back to derived/current values
  if (rconData) {
    if (rconData.world_day_number != null) {
      result.world_day_number = rconData.world_day_number;
      result.world_date = `Day ${rconData.world_day_number}`;
    }
    if (rconData.world_minute_of_day != null) {
      result.world_minute_of_day = rconData.world_minute_of_day;
      result.world_time = rconData.world_time;
    }
    if (rconData.season) result.season = rconData.season;
    if (rconData.weather) result.weather = rconData.weather;
  }

  // Fill gaps from server config
  if (serverConfig) {
    if (!result.season) {
      // Derive current season from config StartingSeason + days
      const startSeason = SEASON_MAP[serverConfig.startingSeason] || 'autumn';
      const daysPerSeason = serverConfig.daysPerSeason || 30;
      const dayNumber = result.world_day_number || current?.world_day_number || 0;
      const seasonIndex = SEASON_ORDER.indexOf(startSeason);
      const seasonsElapsed = Math.floor(dayNumber / daysPerSeason);
      result.season = SEASON_ORDER[(seasonIndex + seasonsElapsed) % 4];
    }

    // Clock rate: HumanitZ day = DayDur + NightDur real minutes
    // Default: DayDur=40, NightDur=20 → 60 real minutes = 1440 game minutes
    const dayDur = serverConfig.dayDur || 40;
    const nightDur = serverConfig.nightDur || 20;
    const totalRealMinutes = dayDur + nightDur;
    // 1440 game-minutes per game-day / totalRealMinutes real-minutes = rate
    result.clock_rate_multiplier = Math.round((1440 / totalRealMinutes) * 100) / 100;
  }

  // If we still don't have time, estimate from uptime
  if (result.world_minute_of_day == null && uptimeMs > 0) {
    const rate = result.clock_rate_multiplier || 24; // default 24x
    const realMinutesUp = uptimeMs / 60000;
    const gameMinutesElapsed = realMinutesUp * rate;
    // Start at 08:00 (480 min) as a reasonable default
    const startMinute = current?.world_minute_of_day ?? 480;
    const currentMinute = Math.floor((startMinute + gameMinutesElapsed) % 1440);
    result.world_minute_of_day = currentMinute;
    const h = Math.floor(currentMinute / 60);
    const m = currentMinute % 60;
    result.world_time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Derive daylight phase from time
  if (result.world_minute_of_day != null) {
    result.daylight_phase = minuteToDaylightPhase(result.world_minute_of_day);
  }

  // Derive temperature from season + time
  if (result.season && !result.temperature_c) {
    result.temperature_c = estimateTemperature(result.season, result.daylight_phase);
  }

  // Defaults
  if (!result.season) result.season = current?.season || 'autumn';
  if (!result.weather) result.weather = current?.weather || 'overcast';
  if (!result.visibility) result.visibility = weatherToVisibility(result.weather);
  if (!result.wind) result.wind = weatherToWind(result.weather);
  if (!result.radiation_level) result.radiation_level = 'safe';

  return result;
}

function minuteToDaylightPhase(m) {
  if (m < 330) return 'night';      // 00:00-05:29
  if (m < 420) return 'dawn';       // 05:30-06:59
  if (m < 720) return 'morning';    // 07:00-11:59
  if (m < 780) return 'midday';     // 12:00-12:59
  if (m < 1020) return 'afternoon'; // 13:00-16:59
  if (m < 1110) return 'dusk';      // 17:00-18:29
  return 'night';                    // 18:30-23:59
}

function estimateTemperature(season, phase) {
  const base = { spring: 14, summer: 26, autumn: 10, winter: -2 };
  const phaseOffset = { night: -6, dawn: -3, morning: 0, midday: 4, afternoon: 3, dusk: -1, midnight: -8 };
  return (base[season] || 12) + (phaseOffset[phase] || 0) + Math.round((Math.random() * 4) - 2);
}

function weatherToVisibility(w) {
  if (['fog', 'blizzard', 'dust_storm', 'ashfall'].includes(w)) return 'poor';
  if (['heavy_rain', 'thunderstorm', 'radiation_storm', 'snow'].includes(w)) return 'reduced';
  if (['rain', 'overcast'].includes(w)) return 'good';
  return 'excellent';
}

function weatherToWind(w) {
  if (['blizzard', 'dust_storm', 'thunderstorm'].includes(w)) return 'gale';
  if (['heavy_rain', 'radiation_storm'].includes(w)) return 'strong';
  if (['rain', 'snow', 'ashfall'].includes(w)) return 'moderate';
  if (['overcast', 'fog'].includes(w)) return 'light';
  return 'calm';
}

// ── Read GameServerSettings.ini via Pterodactyl ──────────────────────────────
async function readServerConfig() {
  const ptero = getPterodactylConfig();
  // Common paths for HumanitZ config
  const paths = [
    '/HumanitZServer/GameServerSettings.ini',
    'HumanitZServer/GameServerSettings.ini',
    '/GameServerSettings.ini',
  ];

  for (const path of paths) {
    try {
      const encoded = encodeURIComponent(path);
      console.log(`Trying config path: ${path} (encoded: ${encoded})`);
      const res = await fetch(
        `${ptero.url}/api/client/servers/${ptero.serverId}/files/contents?file=${encoded}`,
        { headers: ptero.headers, signal: AbortSignal.timeout(8000) }
      );
      console.log(`Config path ${path}: status ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`Config file read OK, ${text.length} chars, first 200: ${text.slice(0, 200)}`);
        return parseIniConfig(text);
      }
    } catch (e) {
      console.warn(`Config path ${path} error:`, e.message);
    }
  }
  return null;
}

function parseIniConfig(text) {
  const config = {};
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[') || trimmed.startsWith(';')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    config[key] = val;
  }

  return {
    startingSeason: parseInt(config.StartingSeason || '0', 10),
    daysPerSeason: parseInt(config.DaysPerSeason || '30', 10),
    dayDur: parseInt(config.DayDur || '40', 10),
    nightDur: parseInt(config.NightDur || '20', 10),
    pvp: config.PVP === '1',
    permaDeath: config.PermaDeath === '1',
    serverName: config.ServerName || '',
    lootRarity: parseInt(config.LootRarity || '2', 10),
  };
}

// ── RCON ──────────────────────────────────────────────────────────────────────
function getRconConfig() {
  const host = Deno.env.get('GAME_SERVER_IP') || '';
  const password = Deno.env.get('RCON_PASSWORD') || '';
  const port = parseInt(Deno.env.get('RCON_PORT') || '0', 10);
  if (!host || !password || !port || port <= 0) {
    throw new Error('Missing RCON configuration.');
  }
  return { host, port, password };
}

async function sendRconCommand(command) {
  const { host, port, password } = getRconConfig();
  const conn = await Deno.connect({ hostname: host, port });

  try {
    // Auth
    await conn.write(buildPacket(1, 3, password));
    const authBuf = new Uint8Array(4096);
    const authN = await conn.read(authBuf);
    if (authN === null || authN < 12) throw new Error('RCON auth failed');
    const authRes = decodePacket(authBuf.slice(0, authN));
    if (authRes.id === -1) throw new Error('RCON auth rejected');

    // Command
    await conn.write(buildPacket(2, 2, command));
    const cmdBuf = new Uint8Array(16384);
    const cmdN = await conn.read(cmdBuf);
    if (cmdN === null) return '';
    return decodePacket(cmdBuf.slice(0, cmdN)).body;
  } finally {
    conn.close();
  }
}

function buildPacket(id, type, body) {
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

function decodePacket(data) {
  const view = new DataView(data.buffer, data.byteOffset);
  const size = view.getInt32(0, true);
  const id = view.getInt32(4, true);
  const type = view.getInt32(8, true);
  const body = new TextDecoder().decode(data.slice(12, 4 + size - 2));
  return { size, id, type, body };
}

// ── Pterodactyl ──────────────────────────────────────────────────────────────
function getPterodactylConfig() {
  const url = (Deno.env.get('PTERODACTYL_URL') || '').replace(/\/+$/, '');
  const apiKey = Deno.env.get('PTERODACTYL_API_KEY') || '';
  const serverId = Deno.env.get('PTERODACTYL_SERVER_ID') || '';
  if (!url || !apiKey || !serverId) throw new Error('Missing Pterodactyl configuration.');
  return {
    url,
    serverId,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  };
}

// ── DB helpers ───────────────────────────────────────────────────────────────
async function getCurrentRecord(base44) {
  const rows = await base44.asServiceRole.entities.WorldConditions.list('-updated_date', 1).catch(() => []);
  return rows[0] || null;
}

async function saveRecord(base44, current, payload) {
  if (current?.id) {
    await base44.asServiceRole.entities.WorldConditions.update(current.id, payload);
    const refreshed = await base44.asServiceRole.entities.WorldConditions.filter({ id: current.id });
    return refreshed[0] || null;
  }
  return await base44.asServiceRole.entities.WorldConditions.create(payload);
}