import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const getRequiredEnv = (names) => {
  const values = Object.fromEntries(names.map((name) => [name, Deno.env.get(name)?.trim() || '']));
  const missing = names.filter((name) => !values[name]);
  if (missing.length > 0) throw new Error(`Missing env: ${missing.join(', ')}`);
  return values;
};

const getRconConfig = () => {
  const values = getRequiredEnv(['GAME_SERVER_IP', 'RCON_PORT', 'RCON_PASSWORD']);
  const port = Number.parseInt(values.RCON_PORT, 10);
  if (!Number.isInteger(port) || port <= 0) throw new Error('RCON_PORT must be a valid positive integer.');
  return { host: values.GAME_SERVER_IP, port, password: values.RCON_PASSWORD };
};

async function sendRconCommand(command) {
  const { host, port, password } = getRconConfig();

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

  function readPacket(data) {
    const view = new DataView(data.buffer, data.byteOffset);
    const size = view.getInt32(0, true);
    const id = view.getInt32(4, true);
    const type = view.getInt32(8, true);
    const body = new TextDecoder().decode(data.slice(12, 4 + size - 2));
    return { size, id, type, body };
  }

  const conn = await Deno.connect({ hostname: host, port });
  try {
    const authPacket = buildPacket(1, 3, password);
    await conn.write(authPacket);
    const authResp = new Uint8Array(4096);
    const authBytesRead = await conn.read(authResp);
    if (authBytesRead === null || authBytesRead < 12) throw new Error("RCON auth failed");
    const authResult = readPacket(authResp.slice(0, authBytesRead));
    if (authResult.id === -1) throw new Error("RCON auth failed");

    const cmdPacket = buildPacket(2, 2, command);
    await conn.write(cmdPacket);
    const cmdResp = new Uint8Array(8192);
    const bytesRead = await conn.read(cmdResp);
    if (bytesRead === null) return "";
    const result = readPacket(cmdResp.slice(0, bytesRead));
    return result.body;
  } finally {
    conn.close();
  }
}

function parsePlayerList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  const players = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase().includes('players on server') || trimmed.toLowerCase().startsWith('id')) continue;
    // Try to parse common formats: "0. PlayerName, 76561198..."
    const match = trimmed.match(/^(\d+)\.\s*(.+?)(?:,\s*(\d+))?$/);
    if (match) {
      players.push({ index: parseInt(match[1]), name: match[2].trim(), steamId: match[3] || null });
    } else {
      players.push({ index: players.length, name: trimmed, steamId: null });
    }
  }
  return players;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch online players via RCON
    let onlinePlayers = [];
    let rconError = null;
    try {
      const raw = await sendRconCommand('ListPlayers');
      onlinePlayers = parsePlayerList(raw);
    } catch (err) {
      rconError = err.message;
    }

    // Fetch app user data for enrichment
    const [users, reputations, opsLogs] = await Promise.all([
      base44.asServiceRole.entities.User.filter({}).catch(() => []),
      base44.asServiceRole.entities.Reputation.filter({}).catch(() => []),
      base44.asServiceRole.entities.OpsLog.list('-created_date', 50).catch(() => []),
    ]);

    // Build reputation map by player email
    const repMap = {};
    for (const rep of reputations) {
      if (!repMap[rep.created_by]) repMap[rep.created_by] = [];
      repMap[rep.created_by].push(rep);
    }

    // Build OpsLog map by player email
    const activityMap = {};
    for (const log of opsLogs) {
      const email = log.player_email;
      if (!email) continue;
      if (!activityMap[email]) activityMap[email] = [];
      if (activityMap[email].length < 10) activityMap[email].push(log);
    }

    // Enrich user data
    const enrichedUsers = users.map(u => {
      const reps = repMap[u.email] || [];
      const totalRep = reps.reduce((sum, r) => sum + (r.score || 0), 0);
      const isOnline = onlinePlayers.some(p => 
        p.name?.toLowerCase() === (u.full_name || '').toLowerCase() ||
        p.name?.toLowerCase() === (u.callsign || '').toLowerCase()
      );
      const kills = (activityMap[u.email] || []).filter(l => l.event_type === 'combat_kill').length;
      const deaths = (activityMap[u.email] || []).filter(l => l.event_type === 'combat_death').length;
      const missionsCompleted = (activityMap[u.email] || []).filter(l => l.event_type === 'mission_completed').length;
      const activity = activityMap[u.email] || [];

      return {
        email: u.email,
        name: u.full_name || u.email,
        callsign: u.callsign || null,
        role: u.role,
        credits: u.credits || 0,
        totalReputation: totalRep,
        factionReps: reps.map(r => ({ faction_id: r.faction_id, faction_name: r.faction_name, score: r.score, rank: r.rank })),
        isOnline,
        kills,
        deaths,
        missionsCompleted,
        recentActivity: activity.slice(0, 5),
        joinedAt: u.created_date,
      };
    });

    return Response.json({
      players: enrichedUsers,
      onlinePlayers,
      recentOpsLogs: opsLogs.slice(0, 30),
      rconError,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('playerTelemetry error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});