import { Crosshair, Search, Award, TrendingUp, TrendingDown, Target } from "lucide-react";

export default function PerformanceStatsGrid({ stats }) {
  const items = [
    { label: "MISSIONS", value: stats.total_missions, icon: Crosshair, color: "text-primary" },
    { label: "COMPLETION", value: `${stats.completion_rate}%`, icon: Target, color: "text-primary" },
    { label: "COMPLETED", value: stats.completed, icon: Crosshair, color: "text-status-ok" },
    { label: "FAILED", value: stats.failed, icon: Crosshair, color: "text-status-danger" },
    { label: "SCAV RUNS", value: stats.total_scavenge_runs, icon: Search, color: "text-accent" },
    { label: "SCAV RATE", value: `${stats.scavenge_success_rate}%`, icon: Search, color: "text-accent" },
    { label: "LOOT VALUE", value: `${stats.total_loot_value}c`, icon: Award, color: "text-accent" },
    { label: "CREDITS EARNED", value: `${stats.total_credits_earned}c`, icon: Award, color: "text-primary" },
    { label: "REP GAINED", value: `+${stats.total_rep_gained}`, icon: TrendingUp, color: "text-status-ok" },
    { label: "REP LOST", value: `-${stats.total_rep_lost}`, icon: TrendingDown, color: "text-status-danger" },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((item) => (
        <div key={item.label} className="border border-border rounded-sm p-2 text-center">
          <item.icon className={`h-3 w-3 mx-auto mb-1 ${item.color}`} />
          <div className="text-xs font-bold font-mono text-foreground">{item.value}</div>
          <div className="text-[7px] text-muted-foreground tracking-wider mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}