import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import TimelineFilters from "../components/timeline/TimelineFilters";
import TimelineFeed from "../components/timeline/TimelineFeed";
import TimelineSummary from "../components/timeline/TimelineSummary";
import SectorHistory from "../components/timeline/SectorHistory";

export default function ConflictTimeline() {
  const [logs, setLogs] = useState([]);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [selectedSector, setSelectedSector] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.entities.TerritoryLog.list("-created_date", 500),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Territory.list("-updated_date", 100),
    ])
      .then(([l, f, t]) => {
        // Filter to last 90 days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        setLogs(l.filter((x) => new Date(x.created_date) >= cutoff));
        setFactions(f);
        setTerritories(t);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.TerritoryLog.subscribe((ev) => {
      if (ev.type === "create") setLogs((p) => [ev.data, ...p]);
    });
    return unsub;
  }, []);

  const factionMap = useMemo(() => {
    const m = {};
    factions.forEach((f) => (m[f.id] = f));
    return m;
  }, [factions]);

  const sectors = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => s.add(l.sector));
    return Array.from(s).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (eventFilter !== "all" && l.event_type !== eventFilter) return false;
      if (sectorFilter !== "all" && l.sector !== sectorFilter) return false;
      return true;
    });
  }, [logs, eventFilter, sectorFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse font-mono">
          DECRYPTING CONFLICT ARCHIVES...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Conflict Timeline
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Territory status, control, and threat level changes — last 90 days
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Summary stats */}
      <TimelineSummary logs={logs} factionMap={factionMap} />

      {/* Filters */}
      <TimelineFilters
        eventFilter={eventFilter}
        sectorFilter={sectorFilter}
        sectors={sectors}
        onEventChange={setEventFilter}
        onSectorChange={setSectorFilter}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main timeline feed */}
        <div className="lg:col-span-2">
          <TimelineFeed
            logs={filtered}
            factionMap={factionMap}
            onSectorClick={setSelectedSector}
          />
        </div>

        {/* Sector drill-down */}
        <div>
          <SectorHistory
            sector={selectedSector}
            logs={logs}
            factionMap={factionMap}
            territories={territories}
            onClose={() => setSelectedSector(null)}
          />
        </div>
      </div>
    </div>
  );
}