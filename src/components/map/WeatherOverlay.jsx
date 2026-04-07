import { cn } from "@/lib/utils";

const ROWS = ["A", "B", "C", "D", "E"];

/**
 * WeatherOverlay — renders colored sector tiles for active weather hazards on the grid map.
 */
export default function WeatherOverlay({ weatherMap, onSectorClick }) {
  if (!weatherMap) return null;

  return Object.entries(weatherMap).map(([sector, data]) => {
    if (!data.hazard) return null;

    const [rowLetter, colStr] = sector.split("-");
    const row = ROWS.indexOf(rowLetter);
    const col = parseInt(colStr) - 1;
    if (row < 0 || col < 0 || isNaN(col)) return null;

    const opacity = Math.min(0.15 + data.severity * 0.07, 0.5);

    return (
      <div
        key={`wx-${sector}`}
        className="absolute pointer-events-auto cursor-pointer transition-all duration-300"
        style={{
          left: `${col * 20}%`,
          top: `${row * 20}%`,
          width: "20%",
          height: "20%",
        }}
        onClick={() => onSectorClick?.(sector)}
      >
        {/* Hazard fill */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            backgroundColor: data.color || "#888",
            opacity,
          }}
        />

        {/* Pulsing border for severe hazards */}
        {data.severity >= 3 && (
          <div
            className="absolute inset-0 rounded-sm animate-pulse"
            style={{
              border: `1.5px solid ${data.color || "#888"}`,
              opacity: 0.6,
            }}
          />
        )}

        {/* Severity indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-sm px-1.5 py-0.5 text-[7px] font-mono font-bold tracking-wider uppercase leading-none"
            style={{
              backgroundColor: `${data.color}30`,
              color: data.color,
              border: `1px solid ${data.color}50`,
            }}
          >
            {data.label?.split(" ")[0]?.slice(0, 6)}
            <span className="ml-0.5 opacity-70">{data.severity}</span>
          </div>
        </div>
      </div>
    );
  });
}