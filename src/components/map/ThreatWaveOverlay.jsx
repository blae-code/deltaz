import { ROWS, COLS } from "./GridMap";

const WAVE_COLORS = {
  horde: "#ef4444",
  raiders: "#f59e0b",
  mutants: "#a855f7",
  storm: "#06b6d4",
  default: "#ef4444",
};

export default function ThreatWaveOverlay({ territories, onSectorClick }) {
  const waveSectors = (territories || []).filter(t => t.active_threat_wave?.status === "incoming");

  if (waveSectors.length === 0) return null;

  return (
    <>
      {waveSectors.map(t => {
        const [rowStr, colStr] = t.sector.split("-");
        const row = ROWS.indexOf(rowStr);
        const col = parseInt(colStr) - 1;
        if (row < 0 || col < 0) return null;

        const wave = t.active_threat_wave;
        const color = WAVE_COLORS[wave.type] || WAVE_COLORS.default;
        const pulseIntensity = Math.min(wave.strength / 100, 1);

        return (
          <div
            key={`wave-${t.id}`}
            className="absolute z-[5] cursor-pointer"
            style={{
              left: `${col * 20}%`,
              top: `${row * 20}%`,
              width: "20%",
              height: "20%",
            }}
            onClick={(e) => { e.stopPropagation(); onSectorClick?.(t.sector); }}
          >
            {/* Pulsing border */}
            <div
              className="absolute inset-0 animate-pulse rounded-sm"
              style={{
                border: `2px solid ${color}`,
                boxShadow: `inset 0 0 ${10 + pulseIntensity * 20}px ${color}40, 0 0 ${8 + pulseIntensity * 15}px ${color}30`,
              }}
            />
            {/* Threat indicator */}
            <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-background/80 rounded-sm px-1 py-0.5 z-10">
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              <span className="text-[7px] font-mono font-bold" style={{ color }}>
                ⚠ {wave.strength}
              </span>
            </div>
            {/* Wave name */}
            <div className="absolute bottom-1 left-1 right-1 text-center">
              <span className="text-[7px] font-mono uppercase tracking-wider px-1 py-0.5 rounded-sm bg-background/70" style={{ color }}>
                {wave.threat_name || wave.type}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}