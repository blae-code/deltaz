import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, AlertTriangle } from "lucide-react";

const TIMING_STYLES = {
  now: "text-status-ok border-status-ok/20 bg-status-ok/5",
  soon: "text-primary border-primary/20 bg-primary/5",
  wait: "text-accent border-accent/20 bg-accent/5",
  avoid: "text-destructive border-destructive/20 bg-destructive/5",
};

const CONGESTION_COLORS = {
  low: "text-status-ok",
  medium: "text-accent",
  high: "text-destructive",
};

export default function HarvestTimingCard({ timing }) {
  const style = TIMING_STYLES[timing.optimal_timing] || TIMING_STYLES.wait;

  return (
    <div className={`border rounded-sm px-3 py-2.5 ${style}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span className="text-[11px] font-mono font-bold uppercase">{timing.resource}</span>
          {timing.sector && (
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" /> {timing.sector}
            </span>
          )}
        </div>
        <Badge variant="outline" className="text-[8px] uppercase font-bold">
          {timing.optimal_timing}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-[9px] mb-1.5 flex-wrap">
        {timing.current_yield_rate > 0 && (
          <span className="font-mono">Yield: {timing.current_yield_rate}/cycle</span>
        )}
        <span className={`flex items-center gap-0.5 ${CONGESTION_COLORS[timing.congestion_level] || ''}`}>
          <Users className="h-2.5 w-2.5" /> {timing.congestion_level} congestion
        </span>
        {timing.depletion_risk && (
          <span className="flex items-center gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" /> {timing.depletion_risk} depletion
          </span>
        )}
      </div>

      {timing.competitor_activity && (
        <p className="text-[9px] text-muted-foreground mb-1 italic">{timing.competitor_activity}</p>
      )}

      <p className="text-[10px] opacity-90 leading-snug font-medium">{timing.recommendation}</p>
    </div>
  );
}