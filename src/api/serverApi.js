import { base44 } from "@/api/base44Client";

function trimText(value, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function inferCurrentState(data) {
  if (typeof data?.current_state === "string" && data.current_state.trim()) {
    return data.current_state.trim();
  }
  if (data?.is_suspended) {
    return "offline";
  }
  return Number(data?.resources?.uptime || 0) > 0 ? "running" : "offline";
}

function parsePlayerLines(raw) {
  if (!raw || typeof raw !== "string") return [];

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().includes("players on server"))
    .filter((line) => !line.toLowerCase().startsWith("id"))
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

export function normalizeServerStatus(data = {}) {
  const current_state = inferCurrentState(data);
  const resources = data?.resources || {};

  return {
    current_state,
    is_running: current_state === "running",
    is_suspended: Boolean(data?.is_suspended),
    resources: {
      memory_bytes: Number(resources.memory_bytes) || 0,
      memory_limit_bytes: Number(resources.memory_limit_bytes) || 0,
      cpu_absolute: Number(resources.cpu_absolute) || 0,
      disk_bytes: Number(resources.disk_bytes) || 0,
      network_rx_bytes: Number(resources.network_rx_bytes) || 0,
      network_tx_bytes: Number(resources.network_tx_bytes) || 0,
      uptime: Number(resources.uptime) || 0,
    },
  };
}

export async function getServerStatus() {
  const res = await base44.functions.invoke("serverManager", { action: "status" });
  return normalizeServerStatus(res.data);
}

export async function performServerPowerAction(action) {
  const res = await base44.functions.invoke("serverManager", { action });
  return res.data;
}

export async function getConnectedPlayers() {
  const res = await base44.functions.invoke("serverManager", { action: "players" });
  const raw = res?.data?.raw ?? res?.data?.result ?? "";
  const players = Array.isArray(res?.data?.players) ? res.data.players : parsePlayerLines(raw);

  return {
    status: res?.data?.status || "ok",
    raw,
    players,
    count: players.length,
  };
}

export async function sendServerBroadcast(message) {
  const sanitizedMessage = trimText(message, 200);
  const res = await base44.functions.invoke("serverManager", {
    action: "broadcast",
    message: sanitizedMessage,
  });
  return {
    ...res.data,
    message: sanitizedMessage,
  };
}

export async function runRconCommand(command) {
  const res = await base44.functions.invoke("serverManager", {
    action: "rcon",
    command: trimText(command, 300),
  });
  return {
    status: res?.data?.status || "ok",
    result: res?.data?.result || "",
  };
}

export async function getPlayerTelemetry() {
  const res = await base44.functions.invoke("playerTelemetry", {});
  return {
    players: Array.isArray(res?.data?.players) ? res.data.players : [],
    onlinePlayers: Array.isArray(res?.data?.onlinePlayers) ? res.data.onlinePlayers : [],
    recentOpsLogs: Array.isArray(res?.data?.recentOpsLogs) ? res.data.recentOpsLogs : [],
    rconError: res?.data?.rconError || null,
    timestamp: res?.data?.timestamp || null,
  };
}

export async function getWhitelistEntries() {
  const res = await base44.functions.invoke("whitelistPlayer", { action: "list" });
  return {
    entries: Array.isArray(res?.data?.entries) ? res.data.entries : [],
    count: Number(res?.data?.count) || 0,
  };
}

export async function addWhitelistEntry({ steam_id, callsign }) {
  const res = await base44.functions.invoke("whitelistPlayer", {
    action: "add",
    steam_id,
    callsign,
  });
  return res.data;
}

export async function removeWhitelistEntry(steam_id) {
  const res = await base44.functions.invoke("whitelistPlayer", {
    action: "remove",
    steam_id,
  });
  return res.data;
}

export async function getSteamLinkStatus() {
  const res = await base44.functions.invoke("steamAuth", { action: "status" });
  return res.data;
}

export async function getSteamLoginUrl(return_url) {
  const res = await base44.functions.invoke("steamAuth", {
    action: "get_login_url",
    return_url,
  });
  return res?.data?.url || "";
}

export async function verifySteamLink(openid_params) {
  const res = await base44.functions.invoke("steamAuth", {
    action: "verify",
    openid_params,
  });
  return res.data;
}

export async function unlinkSteamAccount() {
  const res = await base44.functions.invoke("steamAuth", { action: "unlink" });
  return res.data;
}

export async function getWorldStateStatus() {
  const res = await base44.functions.invoke("worldStateSync", { action: "status" });
  return res.data;
}

export async function pullWorldState() {
  const res = await base44.functions.invoke("worldStateSync", { action: "pull" });
  return res.data;
}

export async function runScheduledTaskExecutor() {
  const res = await base44.functions.invoke("executeScheduledTask", {});
  return res.data;
}

export async function listServerFiles(directory = "/") {
  const res = await base44.functions.invoke("listServerFiles", { directory });
  return {
    directory: res?.data?.directory || directory,
    files: Array.isArray(res?.data?.files) ? res.data.files : [],
  };
}
