import { Badge } from "@/components/ui/badge";
import HeatmapLegend from "./HeatmapLegend";

const resourceColors = [
  { label: "Fuel", color: "#d4a13a" },
  { label: "Metals", color: "#94a3b8" },
  { label: "Tech", color: "#5ba8c8" },
  { label: "Food", color: "#2dd4a0" },
  { label: "Munitions", color: "#c53030" },
];

const statusDefs = [
  { label: "Secured", color: "bg-status-ok/30", border: "border-status-ok/50" },
  { label: "Contested", color: "bg-status-warn/30", border: "border-status-warn/50" },
  { label: "Hostile", color: "bg-status-danger/30", border: "border-status-danger/50" },
  { label: "Uncharted", color: "bg-muted/30", border: "border-muted-foreground/30" },
];

const missionDefs = [
  { label: "Routine", color: "#2dd4a0" },
  { label: "Hazardous", color: "#d4a13a" },
  { label: "Critical", color: "#c47b2a" },
  { label: "Suicide", color: "#c53030" },
];

export default function MapLegend({ showHeatmap, heatmapData, showResourceDensity, showContested, showMissions }) {
  const hasAny = showHeatmap || showResourceDensity || showContested || showMissions;
  if (!hasAny) return null;

  return (
    <div className="border border-border bg-card rounded-sm p-2 space-y-2">
      <span className="text-[9px] font-display tracking-widest text-primary uppercase font-semibold">MAP LEGEND</span>

      {showHeatmap && heatmapData && <HeatmapLegend />}

      {showContested && (
        <div className="space-y-1">
          <span className="text-[8px] text-muted-foreground tracking-wider uppercase">Territory Status</span>
          <div className="flex gap-2 flex-wrap">
            {statusDefs.map(s => (
              <div key={s.label} className="flex items-center gap-1">
                <span className={`h-2.5 w-5 rounded-sm border ${s.color} ${s.border}`} />
                <span className="text-[8px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResourceDensity && (
        <div className="space-y-1">
          <span className="text-[8px] text-muted-foreground tracking-wider uppercase">Resources</span>
          <div className="flex gap-2 flex-wrap">
            {resourceColors.map(r => (
              <div key={r.label} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[8px] text-muted-foreground">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showMissions && (
        <div className="space-y-1">
          <span className="text-[8px] text-muted-foreground tracking-wider uppercase">Mission Difficulty</span>
          <div className="flex gap-2 flex-wrap">
            {missionDefs.map(m => (
              <div key={m.label} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: m.color, backgroundColor: `${m.color}30` }} />
                <span className="text-[8px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}