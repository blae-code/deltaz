import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import GridMap, { ROWS, COLS } from "../map/GridMap";
import TacticalMapLegend from "./TacticalMapLegend";
import TacticalMapSectorInfo from "./TacticalMapSectorInfo";
import { Map } from "lucide-react";
import { Link } from "react-router-dom";

const statusBg = {
  secured: "bg-status-ok/15 border-status-ok/30",
  contested: "bg-status-warn/15 border-status-warn/30",
  hostile: "bg-status-danger/15 border-status-danger/30",
  uncharted: "bg-muted/10 border-border/30",
};

const threatPulse = {
  critical: "animate-pulse",
  high: "animate-pulse",
};

function sectorToPosition(sector) {
  if (!sector) return null;
  const [rowStr, colStr] = sector.split("-");
  const row = ROWS.indexOf(rowStr);
  const col = parseInt(colStr) - 1;
  if (row < 0 || isNaN(col) || col < 0 || col > 4) return null;
  return { row, col };
}

export default function TacticalMapWidget() {
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [hoveredSector, setHoveredSector] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Territory.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 20),
    ])
      .then(([t, f]) => { setTerritories(t); setFactions(f); })
      .finally(() => setLoading(false));

    const unsub = base44.entities.Territory.subscribe((event) => {
      if (event.type === "create") setTerritories((p) => [...p, event.data]);
      else if (event.type === "update") setTerritories((p) => p.map((t) => t.id === event.id ? event.data : t));
      else if (event.type === "delete") setTerritories((p) => p.filter((t) => t.id !== event.id));
    });
    return unsub;
  }, []);

  const territoryBySector = useMemo(() => {
    const map = {};
    territories.forEach((t) => {
      if (t.sector) map[t.sector] = t;
    });
    return map;
  }, [territories]);

  const factionMap = useMemo(() => {
    const map = {};
    factions.forEach((f) => { map[f.id] = f; });
    return map;
  }, [factions]);

  const hoveredTerritory = hoveredSector ? territoryBySector[hoveredSector] : null;
  const hoveredFaction = hoveredTerritory?.controlling_faction_id
    ? factionMap[hoveredTerritory.controlling_faction_id]
    : null;

  const combatZones = territories.filter((t) => t.status === "contested" || t.status === "hostile").length;

  if (loading) {
    return (
      <DataCard title="Tactical Overview">
        <div className="flex items-center justify-center h-48">
          <span className="text-xs text-muted-foreground animate-pulse font-mono">LOADING TACTICAL MAP...</span>
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard
      title="Tactical Overview"
      headerRight={
        <Link to="/map" className="text-[9px] text-primary hover:underline tracking-wider font-mono">
          FULL MAP →
        </Link>
      }
    >
      <div className="grid md:grid-cols-3 gap-4">
        {/* Map */}
        <div className="md:col-span-2">
          <GridMap
            onSectorHover={setHoveredSector}
            className="max-h-[360px]"
          >
            {/* Territory status overlays */}
            {territories.map((t) => {
              const pos = sectorToPosition(t.sector);
              if (!pos) return null;
              const faction = t.controlling_faction_id ? factionMap[t.controlling_faction_id] : null;
              const bgClass = statusBg[t.status] || statusBg.uncharted;
              const pulseClass = threatPulse[t.threat_level] || "";

              return (
                <div
                  key={t.id}
                  className={`absolute border pointer-events-none z-[1] transition-all duration-300 ${bgClass} ${pulseClass}`}
                  style={{
                    left: `${pos.col * 20}%`,
                    top: `${pos.row * 20}%`,
                    width: "20%",
                    height: "20%",
                  }}
                >
                  {/* Faction influence indicator */}
                  {faction && (
                    <div
                      className="absolute top-1 right-1 h-2 w-2 rounded-full border border-background/50"
                      style={{ backgroundColor: faction.color || "#888" }}
                      title={faction.name}
                    />
                  )}
                  {/* Territory label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[7px] font-mono text-foreground/60 leading-none truncate max-w-[90%] text-center">
                      {t.name}
                    </span>
                    {(t.status === "contested" || t.status === "hostile") && (
                      <span className="text-[6px] font-mono text-status-danger tracking-widest mt-0.5">
                        {t.status === "hostile" ? "⚔ HOSTILE" : "⚔ COMBAT"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </GridMap>
        </div>

        {/* Sidebar info */}
        <div className="space-y-3">
          {/* Stats summary */}
          <div className="border border-border rounded-sm p-3 bg-secondary/30 space-y-2">
            <p className="text-[9px] text-muted-foreground tracking-widest uppercase font-mono font-semibold">
              AO STATUS
            </p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-bold font-display text-primary">{territories.length}</p>
                <p className="text-[8px] text-muted-foreground tracking-wider">ZONES</p>
              </div>
              <div>
                <p className="text-lg font-bold font-display text-status-danger">{combatZones}</p>
                <p className="text-[8px] text-muted-foreground tracking-wider">ACTIVE COMBAT</p>
              </div>
            </div>
          </div>

          {/* Hovered sector info */}
          <TacticalMapSectorInfo
            sector={hoveredSector}
            territory={hoveredTerritory}
            faction={hoveredFaction}
          />

          {/* Legend */}
          <TacticalMapLegend />
        </div>
      </div>
    </DataCard>
  );
}