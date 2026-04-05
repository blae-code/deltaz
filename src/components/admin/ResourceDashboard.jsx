import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import FactionEconomyCard from "./FactionEconomyCard";
import ResourceChart from "./ResourceChart";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";

export default function ResourceDashboard() {
  const [economies, setEconomies] = useState([]);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
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

  const initMissing = async () => {
    setInitializing(true);
    const existingIds = economies.map((e) => e.faction_id);
    const missing = factions.filter((f) => !existingIds.includes(f.id));
    for (const f of missing) {
      await base44.entities.FactionEconomy.create({
        faction_id: f.id,
        wealth: 1000,
        tax_rate: 10,
        supply_modifier: 1.0,
        production_rate: 100,
        trade_balance: 0,
        sanctions_active: false,
      });
    }
    toast({ title: `Initialized ${missing.length} faction economies` });
    loadData();
    setInitializing(false);
  };

  const getResourcesForFaction = (factionId) => {
    const controlled = territories.filter((t) => t.controlling_faction_id === factionId);
    const resources = {};
    controlled.forEach((t) => {
      (t.resources || []).forEach((r) => {
        resources[r] = (resources[r] || 0) + 1;
      });
    });
    return { territories: controlled.length, resources };
  };

  const handleUpdate = async (economyId, data) => {
    await base44.entities.FactionEconomy.update(economyId, data);
    toast({ title: "Economy updated" });
    loadData();
  };

  if (loading) {
    return <div className="text-[10px] text-primary animate-pulse tracking-widest">LOADING ECONOMIC DATA...</div>;
  }

  const missingCount = factions.filter((f) => !economies.find((e) => e.faction_id === f.id)).length;

  return (
    <div className="space-y-5">
      <p className="text-[10px] text-muted-foreground">
        Monitor faction resource production, adjust tax rates and supply chain modifiers to shape the global economy.
      </p>

      {missingCount > 0 && (
        <Button size="sm" variant="outline" onClick={initMissing} disabled={initializing} className="text-[10px] uppercase tracking-wider">
          {initializing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
          INIT {missingCount} FACTION ECONOMIES
        </Button>
      )}

      {/* Chart overview */}
      {economies.length > 0 && (
        <ResourceChart economies={economies} factions={factions} />
      )}

      {/* Per-faction cards */}
      <div className="grid gap-4">
        {economies.map((eco) => {
          const faction = factions.find((f) => f.id === eco.faction_id);
          if (!faction) return null;
          const res = getResourcesForFaction(eco.faction_id);
          return (
            <FactionEconomyCard
              key={eco.id}
              economy={eco}
              faction={faction}
              territoryCount={res.territories}
              resources={res.resources}
              onUpdate={(data) => handleUpdate(eco.id, data)}
            />
          );
        })}
      </div>
    </div>
  );
}