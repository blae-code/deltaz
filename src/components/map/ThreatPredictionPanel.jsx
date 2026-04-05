import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Crosshair, Activity } from "lucide-react";

const riskStyles = {
  critical: { badge: "bg-status-danger/20 text-status-danger border-status-danger/30", icon: "text-status-danger" },
  high: { badge: "bg-status-warn/20 text-status-warn border-status-warn/30", icon: "text-status-warn" },
  moderate: { badge: "bg-accent/20 text-accent border-accent/30", icon: "text-accent" },
  low: { badge: "bg-primary/20 text-primary border-primary/30", icon: "text-primary" },
};

export default function ThreatPredictionPanel({ predictions, summary, onSectorClick }) {
  if (!predictions || predictions.length === 0) return null;

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display flex items-center gap-1.5">
          <Activity className="h-3 w-3" /> ARTEMIS THREAT ANALYSIS
        </span>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border/50 text-[9px] text-muted-foreground">
          <span className="text-status-danger font-semibold">{summary.critical_sectors} CRITICAL</span>
          <span className="text-status-warn font-semibold">{summary.high_sectors} HIGH</span>
          <span>{summary.active_conflicts} active conflict{summary.active_conflicts !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Predictions */}
      <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
        {predictions.map((p, i) => {
          const style = riskStyles[p.risk_level] || riskStyles.moderate;
          return (
            <button
              key={i}
              className="w-full text-left px-3 py-2.5 hover:bg-secondary/20 transition-colors"
              onClick={() => onSectorClick?.(p.sector)}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`h-3 w-3 ${style.icon} shrink-0`} />
                <span className="text-[10px] font-mono font-bold text-foreground">SECTOR {p.sector}</span>
                <Badge variant="outline" className={`text-[8px] uppercase ${style.badge}`}>
                  {p.risk_level}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{p.prediction}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Crosshair className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[9px] text-primary">{p.recommended_action}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}