import { ROWS } from "./GridMap";

const statusOpacity = {
  secured: "0.15",
  contested: "0.12",
  hostile: "0.10",
  uncharted: "0.05",
};

export default function TerritoryOverlay({ territory, factionColor }) {
  if (!territory.sector) return null;

  // Parse sector like "A-3" or "B-1"
  const parts = territory.sector.split("-");
  if (parts.length !== 2) return null;

  const rowIdx = ROWS.indexOf(parts[0].toUpperCase());
  const colIdx = parseInt(parts[1]) - 1;
  if (rowIdx < 0 || colIdx < 0 || colIdx > 4) return null;

  const isContested = territory.status === "contested";
  const isHostile = territory.status === "hostile";
  const animationClass = isContested ? "animate-glow-pulse-subtle" : isHostile ? "animate-glow-pulse-strong" : "";

  const color = factionColor || "hsl(var(--primary))";
  const opacity = statusOpacity[territory.status] || "0.08";

  return (
    <div
      className={`absolute pointer-events-none z-0 border transition-colors duration-300 rounded-sm ${animationClass}`}
      style={{
        left: `${colIdx * 20}%`,
        top: `${rowIdx * 20}%`,
        width: "20%",
        height: "20%",
        backgroundColor: isContested ? "hsl(var(--accent) / 0.08)" : isHostile ? "hsl(var(--destructive) / 0.08)" : color,
        opacity: isContested || isHostile ? 1 : opacity, // Set opacity to 1 for animated zones to ensure glow is visible
        borderColor: isContested ? "hsl(var(--accent))" : isHostile ? "hsl(var(--destructive))" : color,
        borderWidth: "1px",
      }}
    >
      <span
        className="absolute bottom-1 right-1 text-[8px] font-mono tracking-wider opacity-70"
        style={{ color }}
      >
        {territory.name}
      </span>
    </div>
  );
}