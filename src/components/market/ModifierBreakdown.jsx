import { Handshake, PackageOpen, Flame } from "lucide-react";

const modConfig = {
  diplomacy: { icon: Handshake, label: "DIPLOMACY", desc: "Trade agreements & wars" },
  supply: { icon: PackageOpen, label: "SUPPLY", desc: "Production & trade routes" },
  demand: { icon: Flame, label: "DEMAND", desc: "Conflicts & embargoes" },
};

export default function ModifierBreakdown({ commodity }) {
  const mods = [
    { key: "diplomacy", value: commodity.diplomacy_modifier || 0 },
    { key: "supply", value: commodity.supply_modifier || 0 },
    { key: "demand", value: commodity.demand_modifier || 0 },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {mods.map((mod) => {
        const config = modConfig[mod.key];
        const Icon = config.icon;
        const isPositive = mod.value > 0;
        const isNegative = mod.value < 0;

        return (
          <div
            key={mod.key}
            className="border border-border rounded-sm p-2 text-center space-y-1"
          >
            <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
            <div className="text-[9px] text-muted-foreground tracking-wider">{config.label}</div>
            <div
              className={`text-xs font-bold font-mono ${
                isPositive ? "text-status-danger" : isNegative ? "text-status-ok" : "text-muted-foreground"
              }`}
            >
              {mod.value > 0 ? "+" : ""}{mod.value}%
            </div>
            <div className="text-[8px] text-muted-foreground/60">{config.desc}</div>
          </div>
        );
      })}
    </div>
  );
}