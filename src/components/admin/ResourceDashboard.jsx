import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus } from "lucide-react";
import ResourceProductionChart from "./ResourceProductionChart";
import FactionEconomyRow from "./FactionEconomyRow";

export default function ResourceDashboard() {
  const [economies, setEconomies] = useState([]);
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [ecos, facs] = await Promise.all([
      base44.entities.FactionEconomy.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
    ]);
    setEconomies(ecos);
    setFactions(facs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Find factions without an economy record
  const missingFactions = factions.filter(
    (f) => f.status === "active" && !economies.find((e) => e.faction_id === f.id)
  );

  const initializeMissing = async () => {
    setInitializing(true);
    for (const f of missingFactions) {
      await base44.entities.FactionEconomy.create({
        faction_id: f.id,
        wealth: 1000,
        resource_production: { fuel: 10, metals: 8, tech: 5, food: 12, munitions: 6 },
        supply_chain_modifier: 1.0,
        tax_rate: 0.1,
        trade_embargo: false,
      });
    }
    await loadData();
    setInitializing(false);
  };

  // Global totals
  const globalWealth = economies.reduce((s, e) => s + (e.wealth || 0), 0);
  const globalProd = economies.reduce((s, e) => {
    const prod = e.resource_production || {};
    const mod = e.supply_chain_modifier || 1;
    return s + Object.values(prod).reduce((ps, v) => ps + (v || 0) * mod, 0);
  }, 0);

  if (loading) {
    return <div className="text-[10px] text-primary animate-pulse tracking-widest py-4">LOADING ECONOMIC DATA...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-[10px] font-mono">
          GLOBAL WEALTH: {Math.round(globalWealth).toLocaleString()}
        </Badge>
        <Badge variant="outline" className="text-[10px] font-mono">
          TOTAL PRODUCTION: {Math.round(globalProd).toLocaleString()}/cycle
        </Badge>
        <Badge variant="outline" className="text-[10px] font-mono">
          FACTIONS TRACKED: {economies.length}
        </Badge>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={loadData} className="text-[10px] font-mono h-7">
          <RefreshCw className="h-3 w-3 mr-1" /> REFRESH
        </Button>
      </div>

      {/* Init missing factions */}
      {missingFactions.length > 0 && (
        <div className="border border-accent/30 bg-accent/5 rounded-sm p-3 flex items-center justify-between">
          <span className="text-[10px] font-mono text-accent">
            {missingFactions.length} FACTION(S) WITHOUT ECONOMIC PROFILE: {missingFactions.map((f) => f.tag).join(", ")}
          </span>
          <Button size="sm" onClick={initializeMissing} disabled={initializing} className="text-[10px] font-mono h-7">
            <Plus className="h-3 w-3 mr-1" /> {initializing ? "INITIALIZING..." : "INITIALIZE"}
          </Button>
        </div>
      )}

      {/* Production chart */}
      {economies.length > 0 && (
        <div className="border border-border rounded-sm p-4 bg-card">
          <h4 className="text-[10px] font-mono tracking-widest text-muted-foreground mb-3">
            EFFECTIVE RESOURCE OUTPUT BY FACTION (AFTER MODIFIERS)
          </h4>
          <ResourceProductionChart economies={economies} factions={factions} />
        </div>
      )}

      {/* Per-faction controls */}
      {economies.length === 0 ? (
        <p className="text-xs text-muted-foreground font-mono">No economic profiles configured.</p>
      ) : (
        <div className="space-y-3">
          {economies.map((eco) => (
            <FactionEconomyRow
              key={eco.id}
              economy={eco}
              faction={factions.find((f) => f.id === eco.faction_id)}
              onSaved={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}