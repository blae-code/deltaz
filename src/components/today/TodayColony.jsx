import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ChevronRight } from "lucide-react";

const gaugeColor = (val) => {
  if (val >= 70) return "bg-status-ok";
  if (val >= 40) return "bg-accent";
  return "bg-destructive";
};

const gaugeLabel = (val) => {
  if (val >= 70) return "text-status-ok";
  if (val >= 40) return "text-accent";
  return "text-destructive";
};

export default function TodayColony({ colony }) {
  if (!colony) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground/60 italic">No settlement data yet. Colony metrics appear here once a GM initializes the colony status.</p>
        <Link to="/colony">
          <Button variant="outline" size="sm" className="text-[10px] uppercase tracking-wider h-8 mt-2">
            <Home className="h-3 w-3 mr-1" /> Go to Colony
          </Button>
        </Link>
      </div>
    );
  }

  const metrics = [
    { label: "Food", value: colony.food_reserves ?? 0 },
    { label: "Water", value: colony.water_supply ?? 0 },
    { label: "Power", value: colony.power_level ?? 0 },
    { label: "Defense", value: colony.defense_integrity ?? 0 },
    { label: "Morale", value: colony.morale ?? 0 },
    { label: "Medical", value: colony.medical_supplies ?? 0 },
  ];

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground uppercase tracking-wider">{m.label}</span>
              <span className={`font-mono font-semibold ${gaugeLabel(m.value)}`}>{m.value}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${gaugeColor(m.value)}`} style={{ width: `${m.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {colony.threat_level && colony.threat_level !== "minimal" && (
        <div className="flex items-center gap-2 border border-accent/30 bg-accent/5 rounded-sm px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] text-accent uppercase tracking-wider font-mono">
            THREAT: {colony.threat_level}
          </span>
        </div>
      )}

      <Link to="/colony">
        <Button variant="outline" size="sm" className="w-full text-[10px] uppercase tracking-wider h-8">
          Colony Details <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </Link>
    </div>
  );
}