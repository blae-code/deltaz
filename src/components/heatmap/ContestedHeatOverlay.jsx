import { ROWS } from "../map/GridMap";

const statusStyles = {
  secured: {
    bg: "rgba(223, 129, 22, 0.18)",
    border: "rgba(223, 129, 22, 0.45)",
    dashed: false,
  },
  contested: {
    bg: "rgba(212, 161, 58, 0.22)",
    border: "rgba(212, 161, 58, 0.6)",
    dashed: true,
  },
  hostile: {
    bg: "rgba(197, 48, 48, 0.25)",
    border: "rgba(197, 48, 48, 0.65)",
    dashed: true,
  },
  uncharted: {
    bg: "rgba(100, 100, 120, 0.06)",
    border: "rgba(100, 100, 120, 0.2)",
    dashed: false,
  },
};

const threatIntensity = {
  minimal: 0,
  low: 0.03,
  moderate: 0.08,
  high: 0.15,
  critical: 0.25,
};

function parseSector(sector) {
  if (!sector) return null;
  const parts = sector.split("-");
  if (parts.length !== 2) return null;
  const rowIdx = ROWS.indexOf(parts[0].toUpperCase());
  const colIdx = parseInt(parts[1]) - 1;
  if (rowIdx < 0 || colIdx < 0 || colIdx > 4) return null;
  return { rowIdx, colIdx };
}

export default function ContestedHeatOverlay({ territories, factionMap }) {
  return (
    <>
      {territories.map((t) => {
        const pos = parseSector(t.sector);
        if (!pos) return null;
        const style = statusStyles[t.status] || statusStyles.uncharted;
        const extraGlow = threatIntensity[t.threat_level] || 0;
        const faction = t.controlling_faction_id ? factionMap[t.controlling_faction_id] : null;

        return (
          <div
            key={`contested-heat-${t.id}`}
            className={`absolute z-[2] transition-all duration-500 ${
              (t.status === "contested" || t.status === "hostile") ? "animate-pulse" : ""
            }`}
            style={{
              left: `${pos.colIdx * 20}%`,
              top: `${pos.rowIdx * 20}%`,
              width: "20%",
              height: "20%",
              backgroundColor: style.bg,
              borderColor: style.border,
              borderWidth: "1.5px",
              borderStyle: style.dashed ? "dashed" : "solid",
              boxShadow: extraGlow > 0 ? `inset 0 0 20px rgba(197, 48, 48, ${extraGlow})` : "none",
            }}
          >
            {/* Faction dot */}
            {faction && (
              <div
                className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full border border-background/60"
                style={{ backgroundColor: faction.color || "#888" }}
                title={faction.name}
              />
            )}

            {/* Status label center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[7px] font-mono text-foreground/50 truncate max-w-[85%] text-center">
                {t.name}
              </span>
              {t.status === "contested" && (
                <span className="text-[6px] font-mono text-status-warn tracking-widest mt-0.5">⚔ CONTESTED</span>
              )}
              {t.status === "hostile" && (
                <span className="text-[6px] font-mono text-status-danger tracking-widest mt-0.5">☠ HOSTILE</span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}