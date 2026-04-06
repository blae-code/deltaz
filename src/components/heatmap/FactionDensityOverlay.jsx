import { useMemo } from "react";
import { ROWS } from "../map/GridMap";

function parseSector(sector) {
  if (!sector) return null;
  const parts = sector.split("-");
  if (parts.length !== 2) return null;
  const rowIdx = ROWS.indexOf(parts[0].toUpperCase());
  const colIdx = parseInt(parts[1]) - 1;
  if (rowIdx < 0 || colIdx < 0 || colIdx > 4) return null;
  return { rowIdx, colIdx };
}

export default function FactionDensityOverlay({ territories, factionMap }) {
  // Group territories by controlling faction, compute per-sector density
  const factionSectors = useMemo(() => {
    const groups = {};
    territories.forEach((t) => {
      if (!t.controlling_faction_id || !t.sector) return;
      const fid = t.controlling_faction_id;
      if (!groups[fid]) groups[fid] = [];
      groups[fid].push(t);
    });
    return groups;
  }, [territories]);

  // Total controlled territory count for max-density calculation
  const maxCount = useMemo(() => {
    let max = 1;
    Object.values(factionSectors).forEach((arr) => {
      if (arr.length > max) max = arr.length;
    });
    return max;
  }, [factionSectors]);

  return (
    <>
      {territories.map((t) => {
        const pos = parseSector(t.sector);
        if (!pos) return null;
        const faction = t.controlling_faction_id ? factionMap[t.controlling_faction_id] : null;
        const factionTerritoryCount = t.controlling_faction_id
          ? (factionSectors[t.controlling_faction_id]?.length || 0)
          : 0;

        // Opacity based on status + relative faction strength
        const baseOpacity = t.status === "secured" ? 0.5 : t.status === "contested" ? 0.3 : t.status === "hostile" ? 0.25 : 0.08;
        const densityBoost = factionTerritoryCount > 0 ? (factionTerritoryCount / maxCount) * 0.2 : 0;
        const opacity = Math.min(baseOpacity + densityBoost, 0.7);

        const color = faction?.color || "#555";

        return (
          <div
            key={`density-${t.id}`}
            className="absolute z-[2] transition-all duration-500 pointer-events-none"
            style={{
              left: `${pos.colIdx * 20}%`,
              top: `${pos.rowIdx * 20}%`,
              width: "20%",
              height: "20%",
              backgroundColor: color,
              opacity,
              border: `1.5px solid ${color}`,
            }}
          >
            {/* Faction tag */}
            {faction && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-[8px] font-mono font-bold tracking-widest"
                  style={{ color: "#fff", textShadow: "0 0 4px rgba(0,0,0,0.8)" }}
                >
                  {faction.tag || faction.name?.substring(0, 3).toUpperCase()}
                </span>
                <span
                  className="text-[6px] font-mono tracking-wider"
                  style={{ color: "#fff", textShadow: "0 0 3px rgba(0,0,0,0.6)" }}
                >
                  {t.name}
                </span>
              </div>
            )}

            {!faction && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[7px] font-mono text-foreground/30 tracking-wider">
                  UNCLAIMED
                </span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}