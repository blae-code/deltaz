const GM_EMAIL = "blae@katrasoluta.com";

/**
 * Returns the display name for a user — never their real name.
 * Game Master account gets special label.
 */
export function getDisplayName(user) {
  if (!user) return "UNKNOWN";
  if (user.email === GM_EMAIL) return "Game Master";
  return user.callsign || user.discord_username || "OPERATIVE";
}

export function isGameMaster(user) {
  return user?.email === GM_EMAIL;
}