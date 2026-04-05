import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Coins, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function FactionEconomyWidget() {
  const [economies, setEconomies] = useState([]);
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.FactionEconomy.list("-wealth", 10),
      base44.entities.Faction.list("-created_date", 20),
    ]).then(([e, f]) => {
      setEconomies(e);
      setFactions(f);
    }).finally(() => setLoading(false));
  }, []);

  const getFaction = (id) => factions.find((f) => f.id === id);

  if (loading) {
    return (
      <DataCard title="Faction Economy">
        <div className="text-xs text-muted-foreground animate-pulse text-center py-4">LOADING ECONOMY DATA...</div>
      </DataCard>
    );
  }

  if (economies.length === 0) {
    return (
      <DataCard title="Faction Economy">
        <p className="text-[10px] text-muted-foreground text-center py-4">No faction economy data available.</p>
      </DataCard>
    );
  }

  return (
    <DataCard title="Faction Economy">
      <div className="space-y-2">
        {economies.map((eco) => {
          const faction = getFaction(eco.faction_id);
          const income = eco.last_cycle_income || 0;
          const trend = income > 0 ? "up" : income < 0 ? "down" : "flat";
          return (
            <div key={eco.id} className="flex items-center gap-3 p-2 border border-border/50 rounded-sm hover:bg-secondary/20 transition-colors">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: faction?.color || "hsl(var(--muted-foreground))" }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">
                  {faction?.name || "Unknown Faction"}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  Supply Chain: {((eco.supply_chain_modifier || 1) * 100).toFixed(0)}%
                  {eco.trade_embargo && <span className="text-destructive ml-1">• EMBARGO</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-bold text-accent font-mono">{(eco.wealth || 0).toLocaleString()}c</div>
                <div className="flex items-center gap-0.5 justify-end text-[9px]">
                  {trend === "up" && <TrendingUp className="h-2.5 w-2.5 text-status-ok" />}
                  {trend === "down" && <TrendingDown className="h-2.5 w-2.5 text-destructive" />}
                  {trend === "flat" && <Minus className="h-2.5 w-2.5 text-muted-foreground" />}
                  <span className={trend === "up" ? "text-status-ok" : trend === "down" ? "text-destructive" : "text-muted-foreground"}>
                    {income >= 0 ? "+" : ""}{income}c
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DataCard>
  );
}