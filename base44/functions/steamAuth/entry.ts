import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const VALID_ACTIONS = new Set(['get_login_url', 'verify', 'unlink', 'status']);

function buildSteamLoginUrl(returnUrl) {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnUrl,
    'openid.realm': new URL(returnUrl).origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

async function verifySteamLogin(params) {
  const verifyParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    verifyParams.set(key, key === 'openid.mode' ? 'check_authentication' : String(value));
  }

  const response = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  });

  const text = await response.text();
  if (!text.includes('is_valid:true')) {
    return null;
  }

  const claimedId = typeof params['openid.claimed_id'] === 'string' ? params['openid.claimed_id'] : '';
  const match = claimedId.match(/\/openid\/id\/(\d+)$/);
  return match ? match[1] : null;
}

async function getUserRecord(base44, email) {
  const users = await base44.asServiceRole.entities.User.filter({ email });
  return users[0] || null;
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
    if (!action) {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (action === 'get_login_url') {
      const returnUrl = typeof body.return_url === 'string' ? body.return_url : '';
      if (!returnUrl) {
        return Response.json({ error: 'return_url required' }, { status: 400 });
      }

      try {
        const url = new URL(returnUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return Response.json({ error: 'return_url must be http(s)' }, { status: 400 });
        }
      } catch (_) {
        return Response.json({ error: 'return_url must be a valid URL' }, { status: 400 });
      }

      return Response.json({ url: buildSteamLoginUrl(returnUrl) });
    }

    if (action === 'verify') {
      const openidParams = body.openid_params && typeof body.openid_params === 'object' ? body.openid_params : null;
      if (!openidParams) {
        return Response.json({ error: 'openid_params required' }, { status: 400 });
      }

      const steamId = await verifySteamLogin(openidParams);
      if (!steamId) {
        return Response.json({ error: 'Steam verification failed. Please try again.' }, { status: 400 });
      }

      const existingUsers = await base44.asServiceRole.entities.User.filter({ steam_id: steamId });
      const alreadyLinked = existingUsers.find((entry) => entry.email !== user.email);
      if (alreadyLinked) {
        return Response.json({ error: 'This Steam account is already linked to another user.' }, { status: 409 });
      }

      const userData = await getUserRecord(base44, user.email);
      if (!userData) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.User.update(userData.id, {
        steam_id: steamId,
        steam_name: `Steam_${steamId.slice(-6)}`,
        steam_linked_at: new Date().toISOString(),
      });

      let whitelistResult = null;
      try {
        whitelistResult = await base44.functions.invoke('whitelistPlayer', {
          action: 'add',
          steam_id: steamId,
          callsign: userData.callsign || user.callsign || user.full_name || user.email,
        });
      } catch (error) {
        console.warn('Auto-whitelist failed (non-blocking):', error.message);
        whitelistResult = { error: error.message };
      }

      return Response.json({
        status: 'ok',
        steam_id: steamId,
        message: 'Steam account linked successfully!',
        whitelisted: !whitelistResult?.error,
      });
    }

    if (action === 'unlink') {
      const userData = await getUserRecord(base44, user.email);
      if (!userData) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const linkedSteamId = typeof userData.steam_id === 'string' ? userData.steam_id.trim() : '';
      let removedFromWhitelist = false;
      let whitelistError = '';

      if (linkedSteamId) {
        try {
          await base44.functions.invoke('whitelistPlayer', {
            action: 'remove',
            steam_id: linkedSteamId,
          });
          removedFromWhitelist = true;
        } catch (error) {
          whitelistError = error instanceof Error ? error.message : 'Failed to remove whitelist entry.';
          console.warn('Whitelist removal during unlink failed (non-blocking):', whitelistError);
        }
      }

      await base44.asServiceRole.entities.User.update(userData.id, {
        steam_id: '',
        steam_name: '',
        steam_linked_at: '',
      });

      return Response.json({
        status: 'ok',
        message: 'Steam account unlinked.',
        removed_from_whitelist: removedFromWhitelist,
        whitelist_error: whitelistError || null,
      });
    }

    const userData = await getUserRecord(base44, user.email);
    return Response.json({
      linked: Boolean(userData?.steam_id),
      steam_id: userData?.steam_id || null,
      steam_name: userData?.steam_name || null,
      linked_at: userData?.steam_linked_at || null,
    });
  } catch (error) {
    console.error('Steam auth error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});
