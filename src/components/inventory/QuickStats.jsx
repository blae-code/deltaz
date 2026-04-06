import { Package, Shield, Coins } from "lucide-react";

export default function QuickStats({ items }) {
  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const equipped = items.filter(i => i.is_equipped).length;
  const totalValue = items.reduce((s, i) => s + (i.value || 0) * (i.quantity || 1), 0);

  const stats = [
    { icon: Package, label: "Items", value: totalQty },
    { icon: Shield, label: "Equipped", value: equipped },
    { icon: Coins, label: "Value", value: `${totalValue}c` },
  ];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <s.icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-mono tracking-wider">{s.label}</span>
          <span className="text-[11px] font-bold font-display text-foreground">{s.value}</span>
        </div>
      ))}
    </div>
  );
}