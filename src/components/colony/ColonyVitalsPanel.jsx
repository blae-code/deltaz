import { useState } from "react";
import {
  Wheat, Droplets, Heart, Zap, Shield, Smile, Users, AlertTriangle
} from "lucide-react";
import ColonyVitalGauge from "./ColonyVitalGauge";
import ResourceAllocationPanel from "./ResourceAllocationPanel";
import { Badge } from "@/components/ui/badge";

const THREAT_COLORS = {
  minimal: "text-status-ok bg-status-ok/10 border-status-ok/20",
  low: "text-status-ok bg-status-ok/10 border-status-ok/20",
  moderate: "text-status-warn bg-status-warn/10 border-status-warn/20",
  high: "text-status-danger bg-status-danger/10 border-status-danger/20",
  critical: "text-destructive bg-destructive/10 border-destructive/20",
};

export default function ColonyVitalsPanel({ colony, isAdmin, survivors, onTaskAssigned }) {
  const [allocatingResource, setAllocatingResource] = useState(null);

  if (!colony) {
    return (
      <div className="border border-dashed border-border rounded-sm px-4 py-8 text-center">
        <AlertTriangle className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
          NO COLONY DATA — ASK A GM TO INITIALIZE COLONY STATUS
        </p>
      </div>
    );
  }

  const food = colony.food_reserves ?? 100;
  const water = colony.water_supply ?? 100;
  const medical = colony.medical_supplies ?? 100;
  const power = colony.power_level ?? 100;
  const defense = colony.defense_integrity ?? 100;
  const morale = colony.morale ?? 100;
  const pop = colony.population ?? 0;
  const threat = colony.threat_level || "minimal";

  // Determine which resources support allocation (food → farm/cook, water → scavenge)
  const handleGaugeClick = (resource) => {
    if (!isAdmin) return;
    setAllocatingResource(allocatingResource === resource ? null : resource);
  };

  const RESOURCE_TASK_MAP = {
    food: ["farm", "cook"],
    water: ["scavenge"],
    medical: ["heal"],
    defense: ["patrol", "defend"],
  };

  return (
    <div className="space-y-3">
      {/* Colony header strip */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold font-display text-primary uppercase tracking-wider">
            {colony.colony_name || "Colony"}
          </h3>
          <Badge variant="outline" className={`text-[8px] uppercase ${THREAT_COLORS[threat] || ""}`}>
            THREAT: {threat}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
          <Users className="h-3 w-3" />
          <span>POP {pop}</span>
        </div>
      </div>

      {/* Vitals grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <ColonyVitalGauge
          icon={Wheat}
          label="Food"
          value={food}
          onClick={isAdmin ? () => handleGaugeClick("food") : undefined}
          actionLabel="Assign farmers"
        />
        <ColonyVitalGauge
          icon={Droplets}
          label="Water"
          value={water}
          onClick={isAdmin ? () => handleGaugeClick("water") : undefined}
          actionLabel="Assign scavengers"
        />
        <ColonyVitalGauge
          icon={Heart}
          label="Medical"
          value={medical}
          onClick={isAdmin ? () => handleGaugeClick("medical") : undefined}
          actionLabel="Assign medics"
        />
        <ColonyVitalGauge
          icon={Zap}
          label="Power"
          value={power}
        />
        <ColonyVitalGauge
          icon={Shield}
          label="Defense"
          value={defense}
          onClick={isAdmin ? () => handleGaugeClick("defense") : undefined}
          actionLabel="Assign patrols"
        />
        <ColonyVitalGauge
          icon={Smile}
          label="Morale"
          value={morale}
          warnThreshold={30}
          critThreshold={15}
        />
      </div>

      {/* Last incident */}
      {colony.last_incident && (
        <div className="border border-status-warn/20 bg-status-warn/5 rounded-sm px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-status-warn shrink-0 mt-0.5" />
          <div>
            <div className="text-[9px] text-status-warn font-mono tracking-wider uppercase">LAST INCIDENT</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{colony.last_incident}</p>
          </div>
        </div>
      )}

      {/* Inline resource allocation panel */}
      {allocatingResource && isAdmin && (
        <ResourceAllocationPanel
          resource={allocatingResource}
          taskTypes={RESOURCE_TASK_MAP[allocatingResource] || []}
          survivors={survivors || []}
          onClose={() => setAllocatingResource(null)}
          onTaskAssigned={onTaskAssigned}
        />
      )}
    </div>
  );
}