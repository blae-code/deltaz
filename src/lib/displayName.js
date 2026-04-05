const GM_EMAIL = "blae@katrasoluta.com";

/**
 * Returns the display name for a user — never their real name.
 * Game Master account gets special label.
 */
export function getDisplayName(user) {
  if (!user) return "UNKNOWN";
  if (isGameMaster(user)) return "Game Master";
  return user.callsign || user.discord_username || "OPERATIVE";
}

export function isGameMaster(user) {
  return user?.email === GM_EMAIL;
}

export function isAdminOrGM(user) {
  return user?.role === "admin" || user?.role === "game_master" || isGameMaster(user);
}