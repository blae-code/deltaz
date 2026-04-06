import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import GridMap, { ROWS, COLS } from "../components/map/GridMap";
import HeatmapControls from "../components/heatmap/HeatmapControls";
import HeatmapLegend from "../components/heatmap/HeatmapLegend";
import HeatmapSectorDetail from "../components/heatmap/HeatmapSectorDetail";
import FactionDensityOverlay from "../components/heatmap/FactionDensityOverlay";
import ContestedHeatOverlay from "../components/heatmap/ContestedHeatOverlay";
import FrontlineShiftOverlay from "../components/heatmap/FrontlineShiftOverlay";
import { Button } from "@/components/ui/button";
import { Layers, RefreshCw } from "lucide-react";

export default function SectorHeatmap() {
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [diplomacy, setDiplomacy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredSector, setHoveredSector] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [mode, setMode] = useState("contested"); // contested | density | frontline
  const [timeRange, setTimeRange] = useState("current"); // current | 24h | 7d | 30d

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Territory.list("-updated_date", 100),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Diplomacy.list("-created_date", 100),
    ])
      .then(([t, f, d]) => {
        setTerritories(t);
        setFactions(f.filter((x) => x.status !== "disbanded"));
        setDiplomacy(d);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Territory.subscribe((event) => {
      if (event.type === "create") setTerritories((p) => [...p, event.data]);
      else if (event.type === "update") setTerritories((p) => p.map((t) => (t.id === event.id ? event.data : t)));
      else if (event.type === "delete") setTerritories((p) => p.filter((t) => t.id !== event.id));
    });
    return unsub;
  }, []);

  const factionMap = useMemo(() => {
    const m = {};
    factions.forEach((f) => (m[f.id] = f));
    return m;
  }, [factions]);

  const territoryBySector = useMemo(() => {
    const m = {};
    territories.forEach((t) => {
      if (t.sector) m[t.sector] = t;
    });
    return m;
  }, [territories]);

  // Filter territories by time window using updated_date
  const filteredTerritories = useMemo(() => {
    if (timeRange === "current") return territories;
    const now = Date.now();
    const ranges = { "24h": 86400000, "7d": 604800000, "30d": 2592000000 };
    const cutoff = now - (ranges[timeRange] || 0);
    return territories.filter((t) => new Date(t.updated_date).getTime() >= cutoff);
  }, [territories, timeRange]);

  const hoveredTerritory = hoveredSector ? territoryBySector[hoveredSector] : null;
  const selectedTerritory = selectedSector ? territoryBySector[selectedSector] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse font-mono">
          LOADING SECTOR HEATMAP DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Sector Heatmap
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Contested zones, faction control density, and front-line shift analysis
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Controls bar */}
      <HeatmapControls
        mode={mode}
        onModeChange={setMode}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* Map + sidebar */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <DataCard
            title={`${mode === "contested" ? "Contested Status" : mode === "density" ? "Faction Control Density" : "Front-Line Shifts"} — ${timeRange === "current" ? "Live" : timeRange.toUpperCase()}`}
          >
            <GridMap
              onSectorHover={setHoveredSector}
              selectedSector={selectedSector}
              onGridClick={({ sector }) => setSelectedSector(sector === selectedSector ? null : sector)}
              className="max-h-[520px]"
            >
              {mode === "contested" && (
                <ContestedHeatOverlay territories={filteredTerritories} factionMap={factionMap} />
              )}
              {mode === "density" && (
                <FactionDensityOverlay territories={filteredTerritories} factionMap={factionMap} />
              )}
              {mode === "frontline" && (
                <FrontlineShiftOverlay
                  territories={territories}
                  filteredTerritories={filteredTerritories}
                  factionMap={factionMap}
                  timeRange={timeRange}
                />
              )}
            </GridMap>
          </DataCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Summary stats */}
          <DataCard title="Sector Analysis">
            <SectorSummary territories={filteredTerritories} factions={factions} diplomacy={diplomacy} />
          </DataCard>

          {/* Selected / Hovered sector detail */}
          <HeatmapSectorDetail
            sector={selectedSector || hoveredSector}
            territory={selectedTerritory || hoveredTerritory}
            faction={
              (selectedTerritory || hoveredTerritory)?.controlling_faction_id
                ? factionMap[(selectedTerritory || hoveredTerritory).controlling_faction_id]
                : null
            }
            diplomacy={diplomacy}
            factionMap={factionMap}
          />

          {/* Legend */}
          <HeatmapLegend mode={mode} />
        </div>
      </div>
    </div>
  );
}

function SectorSummary({ territories, factions, diplomacy }) {
  const contested = territories.filter((t) => t.status === "contested").length;
  const hostile = territories.filter((t) => t.status === "hostile").length;
  const secured = territories.filter((t) => t.status === "secured").length;
  const uncharted = territories.filter((t) => t.status === "uncharted").length;
  const wars = diplomacy.filter((d) => d.status === "war").length;

  // Count factions with territory
  const controllingFactions = new Set(territories.filter((t) => t.controlling_faction_id).map((t) => t.controlling_faction_id));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="TOTAL SECTORS" value={territories.length} color="text-foreground" />
        <MiniStat label="SECURED" value={secured} color="text-status-ok" />
        <MiniStat label="CONTESTED" value={contested} color="text-status-warn" />
        <MiniStat label="HOSTILE" value={hostile} color="text-status-danger" />
        <MiniStat label="UNCHARTED" value={uncharted} color="text-muted-foreground" />
        <MiniStat label="ACTIVE WARS" value={wars} color="text-status-danger" />
      </div>
      <div className="border-t border-border pt-2">
        <p className="text-[9px] text-muted-foreground tracking-wider">
          {controllingFactions.size} faction{controllingFactions.size !== 1 ? "s" : ""} hold territory across {territories.length} mapped sector{territories.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center border border-border/50 rounded-sm py-1.5 bg-secondary/20">
      <p className={`text-lg font-bold font-display ${color}`}>{value}</p>
      <p className="text-[7px] text-muted-foreground tracking-widest">{label}</p>
    </div>
  );
}