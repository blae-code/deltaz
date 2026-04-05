import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import FactionEconomyCard from "./FactionEconomyCard";
import ResourceCharts from "./ResourceCharts";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Plus } from "lucide-react";

export default function ResourceDashboard() {
  const [economies, setEconomies] = useState([]);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cycling, setCycling] = useState(false);
  const { toast } = useToast();

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.entities.FactionEconomy.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Territory.list("-created_date", 50),
    ]).then(([e, f, t]) => {
      setEconomies(e);
      setFactions(f);
      setTerritories(t);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const runCycle = async () => {
    setCycling(true);
    await base44.functions.invoke("economyCycle", {});
    toast({ title: "Economic cycle processed" });
    loadData();
    setCycling(false);
  };

  const initEconomy = async (factionId) => {
    await base44.entities.FactionEconomy.create({
      faction_id: factionId,
      wealth: 1000,
      resource_production: { fuel: 20, munitions: 15, tech: 10, food: 25, medical: 10 },
      supply_modifier: 1.0,
      tax_rate: 0.1,
      trade_balance: 0,
      upkeep_cost: 100,
    });
    toast({ title: "Economy initialized" });
    loadData();
  };

  const handleUpdate = async (econId, updates) => {
    await base44.entities.FactionEconomy.update(econId, updates);
    toast({ title: "Modifiers updated" });
    loadData();
  };

  const factionsWithEcon = factions.map((f) => ({
    ...f,
    economy: economies.find((e) => e.faction_id === f.id),
    territoryCount: territories.filter((t) => t.controlling_faction_id === f.id).length,
  }));

  if (loading) {
    return <div className="text-[10px] text-primary animate-pulse tracking-widest">LOADING ECONOMIC DATA...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Monitor resource production, adjust supply modifiers and tax rates per faction.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={runCycle}
          disabled={cycling}
          className="text-[10px] uppercase tracking-wider"
        >
          {cycling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          {cycling ? "PROCESSING..." : "RUN CYCLE"}
        </Button>
      </div>

      {/* Charts */}
      <ResourceCharts economies={economies} factions={factions} />

      {/* Per-faction cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {factionsWithEcon
          .filter((f) => f.status === "active")
          .map((f) =>
            f.economy ? (
              <FactionEconomyCard
                key={f.id}
                faction={f}
                economy={f.economy}
                territoryCount={f.territoryCount}
                onUpdate={handleUpdate}
              />
            ) : (
              <div key={f.id} className="border border-dashed border-border rounded-sm p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: f.color }}>{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">No economic data</p>
                </div>
                <Button size="sm" variant="outline" className="text-[10px]" onClick={() => initEconomy(f.id)}>
                  <Plus className="h-3 w-3 mr-1" /> INITIALIZE
                </Button>
              </div>
            )
          )}
      </div>
    </div>
  );
}