import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Steam OpenID 2.0 authentication flow
// Step 1: Generate redirect URL to Steam login
// Step 2: Verify the callback and extract Steam ID

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

function buildSteamLoginUrl(returnUrl) {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": new URL(returnUrl).origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

async function verifySteamLogin(params) {
  // Change mode to check_authentication for verification
  const verifyParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "openid.mode") {
      verifyParams.set(key, "check_authentication");
    } else {
      verifyParams.set(key, value);
    }
  }

  const response = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });

  const text = await response.text();
  
  if (!text.includes("is_valid:true")) {
    return null;
  }

  // Extract Steam ID from claimed_id
  // Format: https://steamcommunity.com/openid/id/76561198XXXXXXXXX
  const claimedId = params["openid.claimed_id"] || "";
  const match = claimedId.match(/\/openid\/id\/(\d+)$/);
  if (!match) return null;

  return match[1]; // 64-bit Steam ID
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // === GENERATE STEAM LOGIN URL ===
    if (action === "get_login_url") {
      const { return_url } = body;
      if (!return_url) return Response.json({ error: "return_url required" }, { status: 400 });
      
      // Append a state token so the callback page knows to verify
      const callbackUrl = return_url;
      const steamUrl = buildSteamLoginUrl(callbackUrl);
      return Response.json({ url: steamUrl });
    }

    // === VERIFY STEAM CALLBACK ===
    if (action === "verify") {
      const { openid_params } = body;
      if (!openid_params) return Response.json({ error: "openid_params required" }, { status: 400 });

      const steamId = await verifySteamLogin(openid_params);
      if (!steamId) {
        return Response.json({ error: "Steam verification failed. Please try again." }, { status: 400 });
      }

      // Check if this Steam ID is already linked to another account
      const existingUsers = await base44.asServiceRole.entities.User.filter({ steam_id: steamId });
      const alreadyLinked = existingUsers.find(u => u.email !== user.email);
      if (alreadyLinked) {
        return Response.json({ 
          error: `This Steam account is already linked to another user.` 
        }, { status: 409 });
      }

      // Save Steam ID to user profile
      const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
      const userData = users[0];
      if (!userData) return Response.json({ error: "User not found" }, { status: 404 });

      await base44.asServiceRole.entities.User.update(userData.id, {
        steam_id: steamId,
        steam_name: `Steam_${steamId.slice(-6)}`, // placeholder name
        steam_linked_at: new Date().toISOString(),
      });

      // Auto-whitelist the player on the game server
      let whitelistResult = null;
      try {
        const wlRes = await base44.asServiceRole.functions.invoke('whitelistPlayer', {
          action: 'add',
          steam_id: steamId,
          callsign: userData.callsign || user.full_name || user.email,
          actor_email: user.email,
        });
        whitelistResult = wlRes;
        console.log('Auto-whitelist result:', JSON.stringify(wlRes));
      } catch (wlErr) {
        console.warn('Auto-whitelist failed (non-blocking):', wlErr.message);
        whitelistResult = { error: wlErr.message };
      }

      return Response.json({ 
        status: "ok", 
        steam_id: steamId,
        message: "Steam account linked successfully!",
        whitelisted: !whitelistResult?.error,
      });
    }

    // === UNLINK STEAM ===
    if (action === "unlink") {
      const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
      const userData = users[0];
      if (!userData) return Response.json({ error: "User not found" }, { status: 404 });

      await base44.asServiceRole.entities.User.update(userData.id, {
        steam_id: "",
        steam_name: "",
        steam_linked_at: "",
      });

      return Response.json({ status: "ok", message: "Steam account unlinked." });
    }

    // === GET STEAM STATUS ===
    if (action === "status") {
      const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
      const userData = users[0];
      return Response.json({
        linked: !!(userData?.steam_id),
        steam_id: userData?.steam_id || null,
        steam_name: userData?.steam_name || null,
        linked_at: userData?.steam_linked_at || null,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Steam auth error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});