import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import PageShell from "../components/layout/PageShell";
import StatusStrip from "../components/layout/StatusStrip";
import DataCard from "../components/terminal/DataCard";
import OpsLogFilters from "../components/opslog/OpsLogFilters";
import OpsLogEntry from "../components/opslog/OpsLogEntry";
import OpsLogStats from "../components/opslog/OpsLogStats";
import ManualLogForm from "../components/opslog/ManualLogForm";
import EmptyState from "../components/terminal/EmptyState";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import { Button } from "@/components/ui/button";
import { Shield, Plus, ChevronDown, FileText } from "lucide-react";

const DEFAULT_FILTERS = {
  search: "",
  event_type: "all",
  severity: "all",
  faction_id: "all",
  sector: "all",
  mission_id: "all",
};

export default function OpsLog() {
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showForm, setShowForm] = useState(false);
  const [displayCount, setDisplayCount] = useState(50);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Data queries
  const logsQuery = useEntityQuery(
    "opsLogs",
    () => base44.entities.OpsLog.list("-created_date", 500),
    { subscribeEntities: ["OpsLog"] }
  );
  const { data: rawLogs = [], isLoading, syncMeta } = logsQuery;

  const { data: factions = [] } = useEntityQuery(
    "opslog-factions",
    () => base44.entities.Faction.list("-created_date", 50),
    { subscribeEntities: ["Faction"] }
  );

  const { data: jobs = [] } = useEntityQuery(
    "opslog-jobs",
    () => base44.entities.Job.list("-created_date", 100),
    { subscribeEntities: ["Job"] }
  );

  useRegisterSync("opslog", logsQuery);

  // Extract unique sectors for filter dropdown
  const sectors = useMemo(
    () => [...new Set(rawLogs.map((l) => l.sector).filter(Boolean))].sort(),
    [rawLogs]
  );

  // Missions that appear in logs
  const logMissions = useMemo(() => {
    const missionIds = new Set(rawLogs.map((l) => l.mission_id).filter(Boolean));
    return jobs.filter((j) => missionIds.has(j.id));
  }, [rawLogs, jobs]);

  // Apply filters
  const filtered = useMemo(() => {
    return rawLogs.filter((log) => {
      if (filters.event_type !== "all" && log.event_type !== filters.event_type) return false;
      if (filters.severity !== "all" && log.severity !== filters.severity) return false;
      if (filters.faction_id !== "all" && log.faction_id !== filters.faction_id && log.secondary_faction_id !== filters.faction_id) return false;
      if (filters.sector !== "all" && log.sector !== filters.sector) return false;
      if (filters.mission_id !== "all" && log.mission_id !== filters.mission_id) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = [log.title, log.detail, log.player_callsign, log.target_callsign, log.faction_name, log.sector, log.mission_title, log.weapon]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rawLogs, filters]);

  const displayed = filtered.slice(0, displayCount);
  const isAdmin = user?.role === "admin" || user?.role === "game_master";

  if (isLoading && rawLogs.length === 0) {
    return (
      <PageShell title="Operations Log" subtitle="Centralized combat and event history">
        <SkeletonGrid count={6} />
      </PageShell>
    );
  }

  // Status strip stats
  const last24h = rawLogs.filter((l) => new Date(l.created_date) > new Date(Date.now() - 86400000));
  const combatCount = rawLogs.filter((l) => l.event_type?.startsWith("combat_")).length;
  const criticalCount = rawLogs.filter((l) => l.severity === "critical" || l.severity === "emergency").length;

  const statusItems = [
    { label: "TOTAL ENTRIES", value: rawLogs.length, color: "text-foreground" },
    { label: "LAST 24H", value: last24h.length, color: "text-primary" },
    { label: "COMBAT", value: combatCount, color: "text-destructive" },
    { label: "CRITICAL+", value: criticalCount, color: "text-accent" },
  ];

  return (
    <PageShell
      title="Operations Log"
      subtitle="Centralized combat, mission, and event history — reconstruct any operation"
      syncMeta={syncMeta}
      statusStrip={<StatusStrip items={statusItems} />}
      actions={
        isAdmin && (
          <Button
            variant={showForm ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-3 w-3 mr-1" /> LOG EVENT
          </Button>
        )
      }
    >
      {/* Manual entry form */}
      {showForm && isAdmin && (
        <DataCard title="Manual Log Entry">
          <ManualLogForm factions={factions} onCreated={() => setShowForm(false)} />
        </DataCard>
      )}

      {/* Stats overview */}
      <OpsLogStats logs={rawLogs} />

      {/* Filters */}
      <OpsLogFilters
        filters={filters}
        onFilterChange={setFilters}
        factions={factions}
        sectors={sectors}
        missions={logMissions}
        onRefresh={() => logsQuery.refetch()}
        isFetching={logsQuery.isFetching}
      />

      {/* Log entries */}
      {filtered.length === 0 ? (
        rawLogs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Operations Logged Yet"
            why="The ops log is empty. Events are automatically recorded from missions, combat, territory changes, and diplomacy actions."
            action={isAdmin ? "Use the LOG EVENT button above to manually record an event, or wait for automated events to flow in." : "Ops logs will appear here as events occur in the world."}
          />
        ) : (
          <EmptyState
            icon={Shield}
            title="No Logs Match Filters"
            why={`${rawLogs.length} entries exist but none match the current filter combination.`}
            action="Try widening your filters or clearing the search."
          />
        )
      ) : (
        <div className="space-y-1.5">
          {displayed.map((log) => (
            <OpsLogEntry key={log.id} log={log} />
          ))}

          {filtered.length > displayCount && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-[10px] uppercase tracking-wider"
              onClick={() => setDisplayCount((c) => c + 50)}
            >
              <ChevronDown className="h-3 w-3 mr-1" /> LOAD MORE ({filtered.length - displayCount} remaining)
            </Button>
          )}
        </div>
      )}
    </PageShell>
  );
}