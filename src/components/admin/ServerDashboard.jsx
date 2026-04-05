import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import ServerStatusPanel from "./ServerStatusPanel";
import ServerPowerControls from "./ServerPowerControls";
import ServerBroadcast from "./ServerBroadcast";
import ServerPlayerList from "./ServerPlayerList";
import ServerResourceGauges from "./ServerResourceGauges";

export default function ServerDashboard() {
  const [status, setStatus] = useState(null);
  const [players, setPlayers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("serverManager", { action: "status" });
      setStatus(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch server status");
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("serverManager", { action: "players" });
      setPlayers(res.data.raw);
    } catch {
      // RCON may not be available if server is offline
      setPlayers(null);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchPlayers()]);
    setLoading(false);
  }, [fetchStatus, fetchPlayers]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [refreshAll]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-destructive/40 bg-destructive/10 rounded-sm p-3 text-xs text-destructive font-mono">
          CONNECTION ERROR: {error}
        </div>
      )}

      <ServerStatusPanel status={status} loading={loading} onRefresh={refreshAll} />

      {status && (
        <ServerResourceGauges resources={status.resources} />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <ServerPowerControls
          currentState={status?.current_state}
          onActionComplete={refreshAll}
        />
        <ServerBroadcast />
      </div>

      <ServerPlayerList raw={players} loading={loading} onRefresh={fetchPlayers} />
    </div>
  );
}