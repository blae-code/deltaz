import { ROWS } from "./GridMap";
import { Crosshair } from "lucide-react";

const difficultyColors = {
  routine: "#2dd4a0",
  hazardous: "#d4a13a",
  critical: "#c47b2a",
  suicide: "#c53030",
};

export default function MissionMarkers({ jobs, territories, onSelect }) {
  // Place missions at their territory's sector
  const missionPins = jobs.map(j => {
    const territory = territories.find(t => t.id === j.territory_id);
    if (!territory?.sector) return null;

    const parts = territory.sector.split("-");
    if (parts.length !== 2) return null;
    const rowIdx = ROWS.indexOf(parts[0].toUpperCase());
    const colIdx = parseInt(parts[1]) - 1;
    if (rowIdx < 0 || colIdx < 0 || colIdx > 4) return null;

    // Offset slightly from center to avoid stacking
    const hash = j.id.charCodeAt(0) + (j.id.charCodeAt(1) || 0);
    const offsetX = ((hash % 7) - 3) * 1.5;
    const offsetY = ((hash % 5) - 2) * 1.5;
    const x = colIdx * 20 + 10 + offsetX;
    const y = rowIdx * 20 + 10 + offsetY;

    return { ...j, x, y, territory };
  }).filter(Boolean);

  return (
    <>
      {missionPins.map(m => (
        <button
          key={`mission-${m.id}`}
          className="absolute z-[15] group"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          onClick={(e) => { e.stopPropagation(); onSelect?.(m); }}
          title={m.title}
        >
          <div
            className="h-5 w-5 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-150"
            style={{
              backgroundColor: `${difficultyColors[m.difficulty] || "#d4a13a"}30`,
              borderColor: difficultyColors[m.difficulty] || "#d4a13a",
            }}
          >
            <Crosshair className="h-2.5 w-2.5" style={{ color: difficultyColors[m.difficulty] || "#d4a13a" }} />
          </div>
          {/* Tooltip on hover */}
          <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-card border border-border rounded-sm px-2 py-1 whitespace-nowrap z-50">
            <p className="text-[9px] font-mono font-semibold text-foreground">{m.title}</p>
            <p className="text-[8px] text-muted-foreground">{m.type} · {m.difficulty}</p>
          </div>
        </button>
      ))}
    </>
  );
}