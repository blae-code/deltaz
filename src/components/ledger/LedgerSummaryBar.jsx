import { Fuel, Gem, Cpu, Wheat, Bomb, AlertTriangle, DollarSign } from "lucide-react";

const RESOURCE_ICONS = {
  fuel: Fuel,
  metals: Gem,
  tech: Cpu,
  food: Wheat,
  munitions: Bomb,
};

export default function LedgerSummaryBar({ territories, factions, economies, contestedCount }) {
  const totalWealth = economies.reduce((s, e) => s + (e.wealth || 0), 0);
  const totalSectors = territories.length;
  const resourceSectors = territories.filter((t) => t.resources?.length > 0).length;

  // Total resource points across all territories
  const totalResources = {};
  territories.forEach((t) => {
    (t.resources || []).forEach((r) => {
      const key = r.toLowerCase();
      totalResources[key] = (totalResources[key] || 0) + 1;
    });
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      <SumCard label="TOTAL WEALTH" value={`${(totalWealth / 1000).toFixed(1)}k`} icon={DollarSign} color="text-accent" />
      <SumCard label="SECTORS" value={totalSectors} icon={null} color="text-foreground" />
      <SumCard label="RESOURCE ZONES" value={resourceSectors} icon={null} color="text-primary" />
      {contestedCount > 0 && (
        <SumCard label="CONTESTED RES." value={contestedCount} icon={AlertTriangle} color="text-status-danger" />
      )}
      {Object.entries(totalResources).slice(0, 3).map(([key, count]) => {
        const Icon = RESOURCE_ICONS[key];
        return (
          <SumCard key={key} label={key.toUpperCase()} value={`${count} zones`} icon={Icon} color="text-primary" />
        );
      })}
    </div>
  );
}

function SumCard({ label, value, icon: Icon, color }) {
  return (
    <div className="border border-border bg-card rounded-sm p-2 text-center">
      <div className="flex items-center justify-center gap-1">
        {Icon && <Icon className={`h-3 w-3 ${color}`} />}
        <span className={`text-sm font-bold font-display ${color}`}>{value}</span>
      </div>
      <p className="text-[7px] text-muted-foreground tracking-widest mt-0.5">{label}</p>
    </div>
  );
}