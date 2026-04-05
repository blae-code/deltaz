import { Wrench, Heart, Wheat, Shield, Search, ShoppingBag, Cpu, ChefHat, Smile } from "lucide-react";

const bonusIcons = {
  food_production: Wheat,
  defense: Shield,
  scrap_yield: Search,
  healing: Heart,
  trade_discount: ShoppingBag,
  repair: Wrench,
  crafting: Cpu,
  morale_boost: Smile,
};

export default function ColonyBonusSummary({ survivors }) {
  const active = survivors.filter((s) => s.status === "active");
  const bonuses = {};
  active.forEach((s) => {
    if (s.bonus_type) {
      bonuses[s.bonus_type] = (bonuses[s.bonus_type] || 0) + (s.bonus_value || 0);
    }
  });

  if (Object.keys(bonuses).length === 0) {
    return <p className="text-[10px] text-muted-foreground">No active bonuses. Attract survivors to gain benefits.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(bonuses).map(([type, val]) => {
        const Icon = bonusIcons[type] || Wrench;
        return (
          <div key={type} className="border border-border rounded-sm p-2 flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{type.replace(/_/g, " ")}</div>
              <div className="text-sm font-bold text-primary font-mono">+{val}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}