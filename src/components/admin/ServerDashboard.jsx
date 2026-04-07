import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ServerStatusPanel from "./ServerStatusPanel";
import ServerPowerControls from "./ServerPowerControls";
import ServerBroadcast from "./ServerBroadcast";
import ServerPlayerList from "./ServerPlayerList";
import ServerResourceGauges from "./ServerResourceGauges";
import RconConsole from "./RconConsole";
import { Activity } from "lucide-react";

export default function ServerDashboard() {
  const [status, setStatus] = useState(null);
  const [players, setPlayers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick, setTick] = useState(0);
  const tickRef = useRef(null);

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
    setLastUpdate(new Date());
  }, [fetchStatus, fetchPlayers]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Tick counter for "seconds ago" display
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  const secondsAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : null;

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-ok opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-ok"></span>
          </span>
          <span className="text-[9px] text-status-ok font-mono uppercase tracking-widest">LIVE — Auto-refreshing every 10s</span>
        </div>
        {secondsAgo !== null && (
          <span className="text-[9px] text-muted-foreground font-mono">
            Updated {secondsAgo}s ago
          </span>
        )}
      </div>

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

      <RconConsole />
    </div>
  );
}