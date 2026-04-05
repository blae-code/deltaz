import { Truck, AlertTriangle, TrendingUp, Coins, Package, Shield } from "lucide-react";

export default function LogisticsOverview({ economies, territories, commodities }) {
  const totalWealth = economies.reduce((s, e) => s + (e.wealth || 0), 0);
  const avgSupplyChain = economies.length > 0
    ? (economies.reduce((s, e) => s + (e.supply_chain_modifier || 1), 0) / economies.length).toFixed(2)
    : "—";
  const embargoCount = economies.filter(e => e.trade_embargo).length;
  const contestedTerritories = territories.filter(t => t.status === "contested" || t.status === "hostile").length;
  const scarceCommodities = commodities.filter(c => c.availability === "scarce" || c.availability === "low").length;
  const totalIncome = economies.reduce((s, e) => s + (e.last_cycle_income || 0), 0);

  const stats = [
    { label: "TOTAL FACTION WEALTH", value: `${totalWealth.toLocaleString()}c`, icon: Coins, color: "text-accent" },
    { label: "LAST CYCLE INCOME", value: `${totalIncome.toLocaleString()}c`, icon: TrendingUp, color: "text-primary" },
    { label: "AVG SUPPLY CHAIN", value: `${avgSupplyChain}x`, icon: Truck, color: parseFloat(avgSupplyChain) < 0.8 ? "text-status-danger" : parseFloat(avgSupplyChain) < 1.0 ? "text-status-warn" : "text-status-ok" },
    { label: "ACTIVE EMBARGOES", value: embargoCount, icon: AlertTriangle, color: embargoCount > 0 ? "text-status-danger" : "text-status-ok" },
    { label: "CONTESTED ZONES", value: contestedTerritories, icon: Shield, color: contestedTerritories > 2 ? "text-status-warn" : "text-status-ok" },
    { label: "SCARCE COMMODITIES", value: scarceCommodities, icon: Package, color: scarceCommodities > 1 ? "text-status-warn" : "text-status-ok" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="border border-border bg-card rounded-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
              <span className="text-[8px] text-muted-foreground tracking-widest uppercase font-mono">{stat.label}</span>
            </div>
            <div className={`text-lg font-bold font-display ${stat.color}`}>{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
}