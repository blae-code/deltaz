import { useMemo } from "react";
import { ROWS, COLS } from "../map/GridMap";

function parseSector(sector) {
  if (!sector) return null;
  const parts = sector.split("-");
  if (parts.length !== 2) return null;
  const rowIdx = ROWS.indexOf(parts[0].toUpperCase());
  const colIdx = parseInt(parts[1]) - 1;
  if (rowIdx < 0 || colIdx < 0 || colIdx > 4) return null;
  return { rowIdx, colIdx };
}

// Determine how "hot" a territory is based on recency of change
function getShiftIntensity(territory, timeRange) {
  if (!territory.updated_date) return "stable";
  const now = Date.now();
  const updated = new Date(territory.updated_date).getTime();
  const age = now - updated;

  const ranges = {
    current: 3600000,    // 1 hour
    "24h": 86400000,
    "7d": 604800000,
    "30d": 2592000000,
  };

  const window = ranges[timeRange] || ranges["7d"];
  const ratio = age / window;

  if (ratio < 0.15) return "hot";       // Very recent
  if (ratio < 0.5) return "warm";       // Moderately recent
  if (ratio < 1.0) return "cool";       // Within window
  return "stable";                        // Older
}

const intensityStyles = {
  hot: {
    bg: "rgba(197, 48, 48, 0.3)",
    border: "rgba(197, 48, 48, 0.7)",
    label: "ACTIVE",
    labelColor: "#c53030",
    animate: true,
  },
  warm: {
    bg: "rgba(212, 161, 58, 0.22)",
    border: "rgba(212, 161, 58, 0.6)",
    label: "RECENT",
    labelColor: "#d4a13a",
    animate: false,
  },
  cool: {
    bg: "rgba(45, 212, 160, 0.12)",
    border: "rgba(45, 212, 160, 0.35)",
    label: "",
    labelColor: "#2dd4a0",
    animate: false,
  },
  stable: {
    bg: "rgba(45, 212, 160, 0.05)",
    border: "rgba(45, 212, 160, 0.15)",
    label: "",
    labelColor: "#2dd4a060",
    animate: false,
  },
};

export default function FrontlineShiftOverlay({ territories, filteredTerritories, factionMap, timeRange }) {
  // Build adjacency data for "front line" detection: contested/hostile next to secured
  const sectorSet = useMemo(() => {
    const m = {};
    territories.forEach((t) => {
      if (t.sector) m[t.sector] = t;
    });
    return m;
  }, [territories]);

  const frontLineIds = useMemo(() => {
    const ids = new Set();
    territories.forEach((t) => {
      if (t.status !== "contested" && t.status !== "hostile") return;
      const pos = parseSector(t.sector);
      if (!pos) return;
      // Check 4 neighbors
      const neighbors = [
        { r: pos.rowIdx - 1, c: pos.colIdx },
        { r: pos.rowIdx + 1, c: pos.colIdx },
        { r: pos.rowIdx, c: pos.colIdx - 1 },
        { r: pos.rowIdx, c: pos.colIdx + 1 },
      ];
      for (const n of neighbors) {
        if (n.r < 0 || n.r > 4 || n.c < 0 || n.c > 4) continue;
        const key = `${ROWS[n.r]}-${COLS[n.c]}`;
        const neighbor = sectorSet[key];
        if (neighbor && neighbor.status === "secured" && neighbor.controlling_faction_id !== t.controlling_faction_id) {
          ids.add(t.id);
          ids.add(neighbor.id);
        }
      }
    });
    return ids;
  }, [territories, sectorSet]);

  return (
    <>
      {filteredTerritories.map((t) => {
        const pos = parseSector(t.sector);
        if (!pos) return null;
        const intensity = getShiftIntensity(t, timeRange);
        const style = intensityStyles[intensity];
        const isFrontLine = frontLineIds.has(t.id);
        const faction = t.controlling_faction_id ? factionMap[t.controlling_faction_id] : null;

        return (
          <div
            key={`shift-${t.id}`}
            className={`absolute z-[2] transition-all duration-500 ${style.animate ? "animate-pulse" : ""}`}
            style={{
              left: `${pos.colIdx * 20}%`,
              top: `${pos.rowIdx * 20}%`,
              width: "20%",
              height: "20%",
              backgroundColor: isFrontLine ? "rgba(197, 48, 48, 0.2)" : style.bg,
              borderColor: isFrontLine ? "rgba(197, 48, 48, 0.7)" : style.border,
              borderWidth: isFrontLine ? "2px" : "1px",
              borderStyle: isFrontLine ? "dashed" : "solid",
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {/* Faction color dot */}
              {faction && (
                <div
                  className="h-2 w-2 rounded-full mb-0.5 border border-background/50"
                  style={{ backgroundColor: faction.color || "#888" }}
                />
              )}
              <span className="text-[6px] font-mono text-foreground/40 truncate max-w-[85%]">
                {t.name}
              </span>
              {style.label && (
                <span
                  className="text-[5px] font-mono font-bold tracking-[0.15em] mt-0.5"
                  style={{ color: style.labelColor }}
                >
                  {style.label}
                </span>
              )}
              {isFrontLine && (
                <span className="text-[5px] font-mono font-bold tracking-[0.15em] text-status-danger mt-0.5">
                  ▸ FRONT LINE ◂
                </span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}