import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PTERODACTYL_URL = Deno.env.get("PTERODACTYL_URL");
const PTERODACTYL_API_KEY = Deno.env.get("PTERODACTYL_API_KEY");
const PTERODACTYL_SERVER_ID = Deno.env.get("PTERODACTYL_SERVER_ID");
const GAME_SERVER_IP = Deno.env.get("GAME_SERVER_IP");
const GAME_SERVER_PORT = Deno.env.get("GAME_SERVER_PORT");
const RCON_PORT = Deno.env.get("RCON_PORT");
const RCON_PASSWORD = Deno.env.get("RCON_PASSWORD");

const pteroHeaders = {
  'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
  'Accept': 'Application/vnd.pterodactyl.v1+json',
  'Content-Type': 'application/json',
};

async function sendRconCommand(command) {
  const host = GAME_SERVER_IP;
  const port = parseInt(RCON_PORT);
  const password = RCON_PASSWORD;

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
    await conn.read(authResp);
    const authResult = readPacket(authResp);
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

    const { action, message } = await req.json();

    // --- PTERODACTYL: Get server status & resources ---
    if (action === "status") {
      const res = await fetch(
        `${PTERODACTYL_URL}/api/client/servers/${PTERODACTYL_SERVER_ID}/resources`,
        { headers: pteroHeaders }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pterodactyl API error (${res.status}): ${text}`);
      }
      const data = await res.json();
      const attrs = data.attributes;
      return Response.json({
        current_state: attrs.current_state,
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
    if (action === "start" || action === "stop" || action === "restart" || action === "kill") {
      const res = await fetch(
        `${PTERODACTYL_URL}/api/client/servers/${PTERODACTYL_SERVER_ID}/power`,
        {
          method: 'POST',
          headers: pteroHeaders,
          body: JSON.stringify({ signal: action }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Power action failed (${res.status}): ${text}`);
      }
      return Response.json({ status: "ok", action });
    }

    // --- RCON: Broadcast message ---
    if (action === "broadcast") {
      if (!message) {
        return Response.json({ error: "Message is required" }, { status: 400 });
      }
      const result = await sendRconCommand(`Say ${message}`);
      return Response.json({ status: "ok", result });
    }

    // --- RCON: Get player list ---
    if (action === "players") {
      const result = await sendRconCommand("Players");
      return Response.json({ status: "ok", raw: result });
    }

    // --- RCON: Send arbitrary command (admin) ---
    if (action === "rcon") {
      if (!message) {
        return Response.json({ error: "Command is required" }, { status: 400 });
      }
      const result = await sendRconCommand(message);
      return Response.json({ status: "ok", result });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});