import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// HumanitZ whitelist file — sits next to GameServerSettings.ini
const WHITELIST_PATH = '/HumanitZServer/whitelist.txt';

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
  const port = parseInt(Deno.env.get('RCON_PORT') || '0', 10);
  const password = Deno.env.get('RCON_PASSWORD') || '';
  if (!host || !port || !password) throw new Error('Missing RCON configuration');
  return { host, port, password };
}

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
    if (authBytesRead === null || authBytesRead < 12) throw new Error('RCON auth failed');
    const authResult = readPacket(authResp.slice(0, authBytesRead));
    if (authResult.id === -1) throw new Error('RCON auth failed');

    const cmdPacket = buildPacket(2, 2, command);
    await conn.write(cmdPacket);
    const cmdResp = new Uint8Array(4096);
    const bytesRead = await conn.read(cmdResp);
    if (bytesRead === null) return '';
    const result = readPacket(cmdResp.slice(0, bytesRead));
    return result.body;
  } finally {
    conn.close();
  }
}

async function readWhitelist(ptero) {
  const filePath = encodeURIComponent(WHITELIST_PATH);
  // Some Pterodactyl versions use POST for file reads
  let res = await fetch(
    `${ptero.url}/api/client/servers/${ptero.serverId}/files/contents?file=${filePath}`,
    { method: 'GET', headers: ptero.headers, signal: AbortSignal.timeout(10000) }
  );
  if (res.status === 405) {
    // Fallback to POST method
    res = await fetch(
      `${ptero.url}/api/client/servers/${ptero.serverId}/files/contents?file=${filePath}`,
      { method: 'POST', headers: ptero.headers, signal: AbortSignal.timeout(10000) }
    );
  }
  // File doesn't exist yet — 404 or 400 with "does not exist"
  if (res.status === 404) return '';
  if (!res.ok) {
    const text = await res.text();
    if (text.includes('does not exist')) return ''; // File not created yet
    throw new Error(`Failed to read whitelist (${res.status}): ${text}`);
  }
  return await res.text();
}

async function writeWhitelist(ptero, content) {
  const filePath = encodeURIComponent(WHITELIST_PATH);
  const res = await fetch(
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
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to write whitelist (${res.status}): ${text}`);
  }
}

function parseWhitelist(content) {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, steam_id, callsign } = body;

    // "add" can be called internally (from steamAuth) or by an admin
    if (action === 'add') {
      if (!steam_id || !/^\d{17}$/.test(steam_id)) {
        return Response.json({ error: 'Valid 17-digit Steam ID required' }, { status: 400 });
      }

      const ptero = getPterodactylConfig();
      const currentContent = await readWhitelist(ptero);
      const existingIds = parseWhitelist(currentContent);

      if (existingIds.includes(steam_id)) {
        return Response.json({ status: 'ok', message: 'Already whitelisted', already_existed: true });
      }

      // Append the new Steam ID with a comment
      const comment = callsign ? `    # ${callsign}` : '';
      const newLine = `${steam_id}${comment}`;
      const newContent = currentContent.trimEnd() + '\n' + newLine + '\n';

      await writeWhitelist(ptero, newContent);

      // Try to reload whitelist via RCON (server may be offline)
      let rconResult = '';
      try {
        rconResult = await sendRconCommand('/reloadwhitelist');
      } catch (e) {
        console.warn('RCON reload failed (server may be offline):', e.message);
      }

      // Log the action
      try {
        await base44.asServiceRole.entities.ServerLog.create({
          category: 'whitelist',
          action: 'add',
          detail: `Whitelisted Steam ID ${steam_id}${callsign ? ` (${callsign})` : ''}`,
          actor_email: body.actor_email || 'system',
          actor_callsign: callsign || 'auto-whitelist',
          severity: 'info',
        });
      } catch (e) {
        console.warn('Failed to log whitelist action:', e.message);
      }

      return Response.json({
        status: 'ok',
        message: `Steam ID ${steam_id} added to whitelist`,
        rcon_reload: rconResult || 'attempted',
      });
    }

    // "remove" — admin only
    if (action === 'remove') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      if (!steam_id) {
        return Response.json({ error: 'steam_id required' }, { status: 400 });
      }

      const ptero = getPterodactylConfig();
      const currentContent = await readWhitelist(ptero);
      const lines = currentContent.split('\n');
      const filtered = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return true;
        const id = trimmed.split(/\s/)[0];
        return id !== steam_id;
      });

      await writeWhitelist(ptero, filtered.join('\n') + '\n');

      try {
        await sendRconCommand('/reloadwhitelist');
      } catch (e) {
        console.warn('RCON reload failed:', e.message);
      }

      try {
        await base44.asServiceRole.entities.ServerLog.create({
          category: 'whitelist',
          action: 'remove',
          detail: `Removed Steam ID ${steam_id} from whitelist`,
          actor_email: user.email,
          actor_callsign: user.callsign || user.full_name,
          severity: 'warning',
        });
      } catch (e) {
        console.warn('Failed to log whitelist removal:', e.message);
      }

      return Response.json({ status: 'ok', message: `Steam ID ${steam_id} removed from whitelist` });
    }

    // "list" — admin only
    if (action === 'list') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const ptero = getPterodactylConfig();
      const currentContent = await readWhitelist(ptero);
      const entries = currentContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
          const parts = line.split(/\s+#\s*/);
          return { steam_id: parts[0].trim(), note: parts[1] || '' };
        });

      return Response.json({ status: 'ok', entries, count: entries.length });
    }

    return Response.json({ error: 'Unknown action. Use: add, remove, list' }, { status: 400 });
  } catch (error) {
    console.error('whitelistPlayer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});