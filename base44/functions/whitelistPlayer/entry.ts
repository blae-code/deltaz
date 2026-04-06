import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const WHITELIST_PATH = '/HumanitZServer/whitelist.txt';
const VALID_ACTIONS = new Set(['add', 'remove', 'list']);

function getPterodactylConfig() {
  const url = (Deno.env.get('PTERODACTYL_URL') || '').replace(/\/+$/, '');
  const apiKey = Deno.env.get('PTERODACTYL_API_KEY') || '';
  const serverId = Deno.env.get('PTERODACTYL_SERVER_ID') || '';
  if (!url || !apiKey || !serverId) {
    throw new Error('Missing Pterodactyl configuration');
  }
  return {
    url,
    serverId,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json',
    },
  };
}

function getRconConfig() {
  const host = Deno.env.get('GAME_SERVER_IP') || '';
  const port = Number.parseInt(Deno.env.get('RCON_PORT') || '0', 10);
  const password = Deno.env.get('RCON_PASSWORD') || '';
  if (!host || !port || !password) {
    throw new Error('Missing RCON configuration');
  }
  return { host, port, password };
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

async function sendRconCommand(command) {
  const { host, port, password } = getRconConfig();
  const conn = await Deno.connect({ hostname: host, port });
  try {
    await conn.write(buildPacket(1, 3, password));
    const authResp = new Uint8Array(4096);
    const authBytesRead = await conn.read(authResp);
    if (authBytesRead === null || authBytesRead < 12) {
      throw new Error('RCON auth failed');
    }
    const authResult = decodePacket(authResp.slice(0, authBytesRead));
    if (authResult.id === -1) {
      throw new Error('RCON auth failed');
    }

    await conn.write(buildPacket(2, 2, command));
    const cmdResp = new Uint8Array(4096);
    const bytesRead = await conn.read(cmdResp);
    if (bytesRead === null) {
      return '';
    }
    return decodePacket(cmdResp.slice(0, bytesRead)).body;
  } finally {
    conn.close();
  }
}

async function readWhitelist(ptero) {
  const filePath = encodeURIComponent(WHITELIST_PATH);
  let response = await fetch(
    `${ptero.url}/api/client/servers/${ptero.serverId}/files/contents?file=${filePath}`,
    { method: 'GET', headers: ptero.headers, signal: AbortSignal.timeout(10000) },
  );
  if (response.status === 405) {
    response = await fetch(
      `${ptero.url}/api/client/servers/${ptero.serverId}/files/contents?file=${filePath}`,
      { method: 'POST', headers: ptero.headers, signal: AbortSignal.timeout(10000) },
    );
  }
  if (response.status === 404) {
    return '';
  }
  if (!response.ok) {
    const text = await response.text();
    if (text.includes('does not exist')) {
      return '';
    }
    throw new Error(`Failed to read whitelist (${response.status}): ${text}`);
  }
  return await response.text();
}

async function writeWhitelist(ptero, content) {
  const filePath = encodeURIComponent(WHITELIST_PATH);
  const response = await fetch(
    `${ptero.url}/api/client/servers/${ptero.serverId}/files/write?file=${filePath}`,
    {
      method: 'POST',
      headers: {
        Authorization: ptero.headers.Authorization,
        Accept: ptero.headers.Accept,
        'Content-Type': 'text/plain',
      },
      body: content,
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to write whitelist (${response.status}): ${text}`);
  }
}

function parseWhitelist(content) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

async function getUserRecord(base44, email) {
  const users = await base44.asServiceRole.entities.User.filter({ email });
  return users[0] || null;
}

async function logWhitelistAction(base44, { action, detail, actorEmail, actorCallsign, severity }) {
  try {
    await base44.asServiceRole.entities.ServerLog.create({
      category: 'player_event',
      action,
      detail,
      actor_email: actorEmail,
      actor_callsign: actorCallsign,
      severity,
    });
  } catch (error) {
    console.warn('Failed to log whitelist action:', error.message);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' && VALID_ACTIONS.has(body.action) ? body.action : '';
    const steamId = typeof body.steam_id === 'string' ? body.steam_id.trim() : '';
    const callsign = typeof body.callsign === 'string' ? body.callsign.trim() : '';
    const isAdmin = user.role === 'admin';

    if (!action) {
      return Response.json({ error: 'Unknown action. Use: add, remove, list' }, { status: 400 });
    }

    if (action === 'add') {
      if (!/^\d{17}$/.test(steamId)) {
        return Response.json({ error: 'Valid 17-digit Steam ID required' }, { status: 400 });
      }

      const userData = await getUserRecord(base44, user.email);
      if (!userData) {
        return Response.json({ error: 'User record not found' }, { status: 404 });
      }

      if (!isAdmin && userData.steam_id !== steamId) {
        return Response.json({ error: 'You can only whitelist your verified Steam account' }, { status: 403 });
      }

      const ptero = getPterodactylConfig();
      const currentContent = await readWhitelist(ptero);
      const existingIds = parseWhitelist(currentContent);

      if (existingIds.includes(steamId)) {
        return Response.json({ status: 'ok', message: 'Already whitelisted', already_existed: true });
      }

      const note = callsign || userData.callsign || user.callsign || user.full_name || user.email;
      const newLine = `${steamId}    # ${note}`;
      const prefix = currentContent.trimEnd();
      const newContent = prefix ? `${prefix}\n${newLine}\n` : `${newLine}\n`;
      await writeWhitelist(ptero, newContent);

      let rconResult = '';
      try {
        rconResult = await sendRconCommand('/reloadwhitelist');
      } catch (error) {
        console.warn('RCON reload failed (server may be offline):', error.message);
      }

      await logWhitelistAction(base44, {
        action: 'whitelist_add',
        detail: `Whitelisted Steam ID ${steamId}${note ? ` (${note})` : ''}`,
        actorEmail: user.email,
        actorCallsign: note,
        severity: 'info',
      });

      return Response.json({
        status: 'ok',
        message: `Steam ID ${steamId} added to whitelist`,
        rcon_reload: rconResult || 'attempted',
      });
    }

    if (action === 'remove') {
      if (!isAdmin) {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      if (!steamId) {
        return Response.json({ error: 'steam_id required' }, { status: 400 });
      }

      const ptero = getPterodactylConfig();
      const currentContent = await readWhitelist(ptero);
      const lines = currentContent.split('\n');
      const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return true;
        return trimmed.split(/\s/)[0] !== steamId;
      });

      await writeWhitelist(ptero, `${filtered.join('\n').trimEnd()}\n`);

      try {
        await sendRconCommand('/reloadwhitelist');
      } catch (error) {
        console.warn('RCON reload failed:', error.message);
      }

      await logWhitelistAction(base44, {
        action: 'whitelist_remove',
        detail: `Removed Steam ID ${steamId} from whitelist`,
        actorEmail: user.email,
        actorCallsign: user.callsign || user.full_name || user.email,
        severity: 'warning',
      });

      return Response.json({ status: 'ok', message: `Steam ID ${steamId} removed from whitelist` });
    }

    if (!isAdmin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ptero = getPterodactylConfig();
    const currentContent = await readWhitelist(ptero);
    const entries = currentContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const parts = line.split(/\s+#\s*/);
        return { steam_id: parts[0].trim(), note: parts[1] || '' };
      });

    return Response.json({ status: 'ok', entries, count: entries.length });
  } catch (error) {
    console.error('whitelistPlayer error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});
