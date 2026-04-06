import { Badge } from "@/components/ui/badge";
import { Radio, Map, Shield, AlertTriangle } from "lucide-react";

const effectIcons = {
  intel_created: Radio,
  territory_threat_changed: Map,
  event_created: AlertTriangle,
};

export default function WorldEffectsBanner({ effects }) {
  if (!effects || effects.length === 0) return null;

  return (
    <div className="border border-accent/20 bg-accent/5 rounded-sm px-3 py-2 space-y-1">
      <div className="text-[8px] text-accent font-mono tracking-widest uppercase">WORLD RIPPLE EFFECTS</div>
      <div className="space-y-1">
        {effects.map((effect, idx) => {
          const Icon = effectIcons[effect.type] || Shield;
          return (
            <div key={idx} className="flex items-center gap-2 text-[10px]">
              <Icon className="h-3 w-3 text-accent shrink-0" />
              <span className="text-foreground/80">{effect.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}