import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import LogFilters from "../components/missionlog/LogFilters";
import LogDateGroup from "../components/missionlog/LogDateGroup";
import { ScrollText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function MissionLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    const data = await base44.entities.ServerLog.list("-created_date", 200);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
    const unsub = base44.entities.ServerLog.subscribe((event) => {
      if (event.type === "create") {
        setLogs((prev) => [event.data, ...prev]);
      } else if (event.type === "delete") {
        setLogs((prev) => prev.filter((l) => l.id !== event.id));
      }
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    let result = logs;
    if (category !== "all") {
      result = result.filter((l) => l.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.detail?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          l.actor_callsign?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, category, search]);

  // Group by date
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((log) => {
      const day = moment(log.created_date).format("YYYY-MM-DD");
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const stats = useMemo(() => {
    const today = moment().startOf("day");
    const todayLogs = logs.filter((l) => moment(l.created_date).isSameOrAfter(today));
    return {
      total: logs.length,
      today: todayLogs.length,
      errors: todayLogs.filter((l) => l.severity === "error" || l.severity === "critical").length,
    };
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Mission Log
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Persistent history of server activity, RCON events, and operator actions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[9px] tracking-wider"
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          REFRESH
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-sm p-3 bg-card text-center">
          <p className="text-lg font-bold font-display text-primary">{stats.total}</p>
          <p className="text-[8px] text-muted-foreground tracking-wider">TOTAL ENTRIES</p>
        </div>
        <div className="border border-border rounded-sm p-3 bg-card text-center">
          <p className="text-lg font-bold font-display text-foreground">{stats.today}</p>
          <p className="text-[8px] text-muted-foreground tracking-wider">TODAY</p>
        </div>
        <div className="border border-border rounded-sm p-3 bg-card text-center">
          <p className="text-lg font-bold font-display text-status-danger">{stats.errors}</p>
          <p className="text-[8px] text-muted-foreground tracking-wider">ERRORS TODAY</p>
        </div>
      </div>

      {/* Filters */}
      <LogFilters
        category={category}
        onCategoryChange={setCategory}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Log entries */}
      <div className="border border-border rounded-sm bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-xs text-muted-foreground animate-pulse font-mono">LOADING MISSION LOG...</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ScrollText className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground font-mono">No log entries found.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            {grouped.map(([date, dateLogs]) => (
              <LogDateGroup key={date} date={date} logs={dateLogs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}