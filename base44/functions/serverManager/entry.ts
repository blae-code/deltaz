import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const PTERODACTYL_ACTIONS = new Set(['status', 'start', 'stop', 'restart', 'kill']);
const RCON_ACTIONS = new Set(['broadcast', 'players', 'rcon']);

const getRequiredEnv = (names) => {
  const values = Object.fromEntries(names.map((name) => [name, Deno.env.get(name)?.trim() || '']));
  const missing = names.filter((name) => !values[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return values;
};

const getPterodactylConfig = () => {
  const values = getRequiredEnv(['PTERODACTYL_URL', 'PTERODACTYL_API_KEY', 'PTERODACTYL_SERVER_ID']);
  return {
    url: values.PTERODACTYL_URL.replace(/\/+$/, ''),
    serverId: values.PTERODACTYL_SERVER_ID,
    headers: {
      Authorization: `Bearer ${values.PTERODACTYL_API_KEY}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json',
    },
  };
};

const getRconConfig = () => {
  const values = getRequiredEnv(['GAME_SERVER_IP', 'RCON_PORT', 'RCON_PASSWORD']);
  const port = Number.parseInt(values.RCON_PORT, 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('RCON_PORT must be a valid positive integer.');
  }

  return {
    host: values.GAME_SERVER_IP,
    port,
    password: values.RCON_PASSWORD,
  };
};

const sanitizeBroadcastMessage = (message) => message.replace(/\s+/g, ' ').trim().slice(0, 200);

function inferCurrentState(attributes) {
  const explicit = typeof attributes?.current_state === 'string' ? attributes.current_state.trim() : '';
  if (explicit) {
    return explicit;
  }

  if (attributes?.is_suspended) {
    return 'offline';
  }

  const uptime = Number(attributes?.resources?.uptime || 0);
  return uptime > 0 ? 'running' : 'offline';
}

function parsePlayerList(raw) {
  if (!raw || typeof raw !== 'string') return [];

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.toLowerCase().includes('players on server'))
    .filter((line) => !line.toLowerCase().startsWith('id'))
    .map((line, index) => {
      const match = line.match(/^(\d+)\.\s*(.+?)(?:,\s*(\d+))?$/);
      if (!match) {
        return {
          index,
          display: line,
          name: line,
          steam_id: null,
        };
      }

      return {
        index: Number.parseInt(match[1], 10),
        display: line,
        name: match[2].trim(),
        steam_id: match[3] || null,
      };
    });
}

async function sendRconCommand(command) {
  const { host, port, password } = getRconConfig();

  // Build RCON packet
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
    // Authenticate
    const authPacket = buildPacket(1, 3, password);
    await conn.write(authPacket);
    const authResp = new Uint8Array(4096);
    const authBytesRead = await conn.read(authResp);
    if (authBytesRead === null || authBytesRead < 12) {
      throw new Error("RCON authentication failed");
    }
    const authResult = readPacket(authResp.slice(0, authBytesRead));
    if (authResult.id === -1) {
      throw new Error("RCON authentication failed");
    }

    // Send command
    const cmdPacket = buildPacket(2, 2, command);
    await conn.write(cmdPacket);
    const cmdResp = new Uint8Array(4096);
    const bytesRead = await conn.read(cmdResp);
    if (bytesRead === null) return "";
    const result = readPacket(cmdResp.slice(0, bytesRead));
    return result.body;
  } finally {
    conn.close();
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const action = typeof body.action === 'string' ? body.action.trim() : '';
    const message = typeof body.message === 'string' ? body.message : '';
    if (!action) {
      return Response.json({ error: 'Action is required' }, { status: 400 });
    }

    // Helper: write a log entry
    const writeLog = async (category, actionName, detail, severity = 'info', metadata = null) => {
      try {
        await base44.asServiceRole.entities.ServerLog.create({
          category,
          action: actionName,
          detail,
          actor_email: user.email,
          actor_callsign: user.callsign || user.full_name || user.email,
          severity,
          metadata: metadata ? JSON.stringify(metadata) : null,
        });
      } catch (e) {
        console.warn('Failed to write server log:', e.message);
      }
    };

    // --- PTERODACTYL: Get server status & resources ---
    if (action === "status") {
      const pterodactyl = getPterodactylConfig();
      const res = await fetch(
        `${pterodactyl.url}/api/client/servers/${pterodactyl.serverId}/resources`,
        { headers: pterodactyl.headers, signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pterodactyl API error (${res.status}): ${text}`);
      }
      const data = await res.json();
      const attrs = data.attributes;
      const currentState = inferCurrentState(attrs);
      return Response.json({
        current_state: currentState,
        is_running: currentState === 'running',
        is_suspended: attrs.is_suspended,
        resources: {
          memory_bytes: attrs.resources?.memory_bytes || 0,
          memory_limit_bytes: attrs.resources?.memory_limit_bytes || 0,
          cpu_absolute: attrs.resources?.cpu_absolute || 0,
          disk_bytes: attrs.resources?.disk_bytes || 0,
          network_rx_bytes: attrs.resources?.network_rx_bytes || 0,
          network_tx_bytes: attrs.resources?.network_tx_bytes || 0,
          uptime: attrs.resources?.uptime || 0,
        },
      });
    }

    // --- PTERODACTYL: Power actions ---
    if (PTERODACTYL_ACTIONS.has(action) && action !== 'status') {
      const pterodactyl = getPterodactylConfig();
      const res = await fetch(
        `${pterodactyl.url}/api/client/servers/${pterodactyl.serverId}/power`,
        {
          method: 'POST',
          headers: pterodactyl.headers,
          body: JSON.stringify({ signal: action }),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        await writeLog('power_action', action, `Power action '${action}' FAILED: ${text}`, 'error');
        throw new Error(`Power action failed (${res.status}): ${text}`);
      }
      await writeLog('power_action', action, `Server power action: ${action.toUpperCase()}`, action === 'kill' ? 'warning' : 'info');
      return Response.json({ status: "ok", action });
    }

    // --- RCON: Broadcast message ---
    if (action === "broadcast") {
      const sanitized = sanitizeBroadcastMessage(message);
      if (!sanitized) {
        return Response.json({ error: "Message is required" }, { status: 400 });
      }
      let rconResult = '';
      try {
        rconResult = await sendRconCommand(`Say ${sanitized}`);
      } catch (rconErr) {
        console.warn('RCON broadcast failed (server may be offline):', rconErr.message);
        await writeLog('broadcast', 'broadcast', `Broadcast FAILED (server offline): ${sanitized}`, 'error');
      }

      // Also create an in-app notification for all players
      await base44.asServiceRole.entities.Notification.create({
        player_email: 'broadcast',
        title: 'Server Broadcast',
        message: sanitized,
        type: 'system_alert',
        priority: 'high',
        is_read: false,
      });

      // Create a world event for the COMMS feed
      await base44.asServiceRole.entities.Event.create({
        title: `BROADCAST: ${sanitized.slice(0, 60)}`,
        content: sanitized,
        type: 'broadcast',
        severity: 'warning',
        is_active: true,
      });

      await writeLog('broadcast', 'broadcast', `Server broadcast: "${sanitized}"`, 'info');
      return Response.json({ status: "ok", result: rconResult });
    }

    // --- RCON: Arbitrary command ---
    if (action === "rcon") {
      const command = typeof body.command === 'string' ? body.command.trim() : '';
      if (!command) {
        return Response.json({ error: "Command is required" }, { status: 400 });
      }
      let result = '';
      try {
        result = await sendRconCommand(command);
        await writeLog('rcon_command', 'rcon', `RCON command: ${command}`, 'info', { command, output: result });
      } catch (rconErr) {
        await writeLog('rcon_command', 'rcon', `RCON command FAILED: ${command} — ${rconErr.message}`, 'error', { command, error: rconErr.message });
        throw rconErr;
      }
      return Response.json({ status: "ok", result });
    }

    // --- RCON: Player list ---
    if (action === "players") {
      let result = '';
      try {
        result = await sendRconCommand('ListPlayers');
      } catch (rconErr) {
        console.warn('RCON players list failed:', rconErr.message);
      }
      return Response.json({
        status: "ok",
        result,
        raw: result,
        players: parsePlayerList(result),
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error('serverManager error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
