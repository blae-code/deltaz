import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Loader2, Wifi, WifiOff, Users } from "lucide-react";
import PlayerTelemetryTable from "./PlayerTelemetryTable";
import PlayerActivityLog from "./PlayerActivityLog";
import PlayerDetailDrawer from "./PlayerDetailDrawer";

export default function PlayerTelemetryPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterOnline, setFilterOnline] = useState(false);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("playerTelemetry", {});
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  // Filter and sort players
  let players = data?.players || [];
  if (search) {
    const q = search.toLowerCase();
    players = players.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.callsign?.toLowerCase().includes(q)
    );
  }
  if (filterOnline) {
    players = players.filter(p => p.isOnline);
  }

  players = [...players].sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const onlineCount = (data?.players || []).filter(p => p.isOnline).length;
  const totalCount = (data?.players || []).length;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground ml-2 font-mono tracking-wider">LOADING TELEMETRY...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {totalCount} REGISTERED
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-ok opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-ok" />
            </span>
            <span className="text-xs font-mono text-status-ok uppercase tracking-wider">
              {onlineCount} ONLINE
            </span>
          </div>
          {data?.rconError && (
            <div className="flex items-center gap-1 text-[10px] text-accent font-mono">
              <WifiOff className="h-3 w-3" /> RCON offline
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="h-7 text-[10px] uppercase tracking-wider">
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="border border-destructive/40 bg-destructive/10 rounded-sm p-3 text-xs text-destructive font-mono">
          {error}
        </div>
      )}

      {/* Search and filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or callsign..."
            className="h-8 text-[11px] bg-secondary/50 border-border font-mono pl-8"
          />
        </div>
        <button
          onClick={() => setFilterOnline(!filterOnline)}
          className={`text-[10px] px-3 py-1.5 rounded-sm border font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
            filterOnline
              ? "bg-status-ok/10 text-status-ok border-status-ok/30"
              : "bg-secondary/30 text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          <Wifi className="h-3 w-3" /> Online Only
        </button>
      </div>

      {/* Player stats table */}
      <PlayerTelemetryTable
        players={players}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
          else { setSortKey(key); setSortDir("desc"); }
        }}
        onSelectPlayer={setSelectedPlayer}
      />

      {/* Activity log */}
      <PlayerActivityLog logs={data?.recentOpsLogs || []} />

      {/* Detail drawer */}
      {selectedPlayer && (
        <PlayerDetailDrawer
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}