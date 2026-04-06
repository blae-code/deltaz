import { Flame, Users, GitBranch, Clock } from "lucide-react";

const MODES = [
  { key: "contested", label: "Contested Status", icon: Flame, desc: "Threat levels & combat zones" },
  { key: "density", label: "Faction Density", icon: Users, desc: "Control distribution per faction" },
  { key: "frontline", label: "Front-Line Shifts", icon: GitBranch, desc: "Territory changes over time" },
];

const TIME_RANGES = [
  { key: "current", label: "LIVE" },
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
];

export default function HeatmapControls({ mode, onModeChange, timeRange, onTimeRangeChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card rounded-sm p-3">
      {/* Mode selector */}
      <div className="flex gap-1.5">
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => onModeChange(m.key)}
              className={`flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-mono px-3 py-1.5 rounded-sm border transition-all ${
                active
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:border-border"
              }`}
              title={m.desc}
            >
              <m.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Time interval selector */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <div className="flex bg-secondary/50 rounded-sm border border-border overflow-hidden">
          {TIME_RANGES.map((t) => (
            <button
              key={t.key}
              onClick={() => onTimeRangeChange(t.key)}
              className={`text-[9px] font-mono tracking-wider px-2.5 py-1 transition-colors ${
                timeRange === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}