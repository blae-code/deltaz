import { ArrowLeftRight, CheckCircle, Package, TrendingUp } from "lucide-react";

export default function BazaarStats({ trades, transactions }) {
  const openCount = trades.filter(t => t.status === "open").length;
  const completedCount = transactions.filter(t => t.status === "completed").length;
  const totalVolume = transactions.reduce((sum, t) => sum + (t.quantity_sold || 0), 0);

  const items = [
    { icon: Package, label: "Open Listings", value: openCount, color: "text-primary" },
    { icon: CheckCircle, label: "Completed", value: completedCount, color: "text-status-ok" },
    { icon: TrendingUp, label: "Volume Traded", value: totalVolume, color: "text-accent" },
    { icon: ArrowLeftRight, label: "Total Listings", value: trades.length, color: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="border border-border bg-card rounded-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`h-3 w-3 ${item.color}`} />
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
            </div>
            <div className={`text-lg font-bold font-display ${item.color}`}>{item.value}</div>
          </div>
        );
      })}
    </div>
  );
}