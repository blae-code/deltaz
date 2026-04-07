import { Fuel, Gem, Cpu, Wheat, Bomb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RESOURCE_TYPES = ["fuel", "metals", "tech", "food", "munitions"];

const RESOURCE_ICONS = {
  fuel: Fuel,
  metals: Gem,
  tech: Cpu,
  food: Wheat,
  munitions: Bomb,
};

const RESOURCE_COLORS = {
  fuel: "text-accent",
  metals: "text-muted-foreground",
  tech: "text-status-info",
  food: "text-status-ok",
  munitions: "text-status-danger",
};

export default function FactionResourceBreakdown({ factions, factionResources, economyByFaction, territories }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {factions.map((f) => {
        const res = factionResources[f.id] || {};
        const econ = economyByFaction[f.id];
        const controlled = territories.filter((t) => t.controlling_faction_id === f.id);
        const contested = controlled.filter((t) => t.status === "contested" || t.status === "hostile");
        const totalZones = RESOURCE_TYPES.reduce((s, r) => s + (res[r] || 0), 0);

        return (
          <div key={f.id} className="border border-border bg-card rounded-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/30">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: f.color || "#888" }} />
              <span className="text-[10px] font-mono font-semibold text-foreground tracking-wider">
                {f.tag ? `[${f.tag}]` : ""} {f.name}
              </span>
              {contested.length > 0 && (
                <Badge variant="outline" className="text-[7px] h-4 border-status-danger/40 text-status-danger ml-auto">
                  {contested.length} CONTESTED
                </Badge>
              )}
            </div>

            {/* Resource bars */}
            <div className="p-3 space-y-2">
              {RESOURCE_TYPES.map((r) => {
                const zones = res[r] || 0;
                const prod = econ?.resource_production?.[r] || 0;
                const Icon = RESOURCE_ICONS[r];
                const maxBar = Math.max(totalZones, 1);
                const pct = Math.min((zones / maxBar) * 100, 100);

                return (
                  <div key={r}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1">
                        <Icon className={`h-2.5 w-2.5 ${RESOURCE_COLORS[r]}`} />
                        <span className="text-[8px] font-mono text-muted-foreground tracking-wider uppercase">{r}</span>
                      </div>
                      <span className="text-[8px] font-mono text-foreground">
                        {zones} zone{zones !== 1 ? "s" : ""} · +{prod}/cycle
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: f.color || "hsl(32 82% 48%)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Summary row */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50 mt-1">
                <span className="text-[8px] text-muted-foreground">{controlled.length} territories</span>
                <span className="text-[8px] text-primary font-semibold">{econ?.wealth?.toLocaleString() || 0} credits</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}