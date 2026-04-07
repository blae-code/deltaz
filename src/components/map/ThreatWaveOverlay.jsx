import { ROWS, COLS } from "./GridMap";

const WAVE_COLORS = {
  horde: "#ef4444",
  raiders: "#f59e0b",
  mutants: "#a855f7",
  storm: "#06b6d4",
  siege: "#f43f5e",
  default: "#ef4444",
};

const BEHAVIOR_ICONS = {
  swarm: "🌊",
  targeted: "🎯",
  adaptive: "🧬",
  area: "🌀",
  siege: "🏰",
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
        const hasModifiers = (wave.modifiers || []).length > 0;
        const isTargeted = !!wave.targeted_base_name;
        const isSplit = !!wave.split_wave_sector;
        const behaviorIcon = BEHAVIOR_ICONS[wave.behavior] || "⚠";

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
                boxShadow: `inset 0 0 ${10 + pulseIntensity * 25}px ${color}40, 0 0 ${8 + pulseIntensity * 18}px ${color}30`,
                background: `radial-gradient(ellipse at center, ${color}15 0%, transparent 70%)`,
              }}
            />

            {/* Split line indicator to adjacent sector */}
            {isSplit && (() => {
              const [sr, sc] = wave.split_wave_sector.split("-");
              const sRow = ROWS.indexOf(sr);
              const sCol = parseInt(sc) - 1;
              if (sRow < 0 || sCol < 0) return null;
              // Draw a line from center of this cell toward the split target
              const fromX = 50; // center of cell in %
              const fromY = 50;
              const toX = ((sCol - col) * 100) + 50; // relative
              const toY = ((sRow - row) * 100) + 50;
              return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[6] overflow-visible" viewBox="0 0 100 100">
                  <line
                    x1={fromX} y1={fromY}
                    x2={toX} y2={toY}
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.6"
                  />
                  <circle cx={toX} cy={toY} r="3" fill={color} opacity="0.5" />
                </svg>
              );
            })()}

            {/* Top-right: strength + behavior */}
            <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 bg-background/85 rounded-sm px-1 py-0.5 z-10 border border-border/50">
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              <span className="text-[7px] font-mono font-bold" style={{ color }}>
                {behaviorIcon} {wave.strength}
              </span>
            </div>

            {/* Bottom: wave name */}
            <div className="absolute bottom-0.5 left-0.5 right-0.5 text-center">
              <span className="text-[7px] font-mono uppercase tracking-wider px-1 py-0.5 rounded-sm bg-background/75 border border-border/30 inline-flex items-center gap-0.5" style={{ color }}>
                {wave.threat_name?.split(" ").slice(0, 2).join(" ")}
                {hasModifiers && <span className="text-accent">⚡</span>}
                {isTargeted && <span className="text-destructive">🎯</span>}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}