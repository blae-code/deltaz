import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import StockpileChart from "../components/ledger/StockpileChart";
import ResourceByTerritory from "../components/ledger/ResourceByTerritory";
import ContestedResourceAlerts from "../components/ledger/ContestedResourceAlerts";
import FactionResourceBreakdown from "../components/ledger/FactionResourceBreakdown";
import LedgerSummaryBar from "../components/ledger/LedgerSummaryBar";

const RESOURCE_TYPES = ["fuel", "metals", "tech", "food", "munitions"];

export default function ResourceLedger() {
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [economies, setEconomies] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Territory.list("-updated_date", 100),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.FactionEconomy.list("-created_date", 50),
      base44.entities.CommodityPrice.list("-updated_date", 20),
    ])
      .then(([t, f, e, c]) => {
        setTerritories(t);
        setFactions(f.filter((x) => x.status !== "disbanded"));
        setEconomies(e);
        setCommodities(c);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const unsub1 = base44.entities.Territory.subscribe((ev) => {
      if (ev.type === "create") setTerritories((p) => [...p, ev.data]);
      else if (ev.type === "update") setTerritories((p) => p.map((t) => (t.id === ev.id ? ev.data : t)));
      else if (ev.type === "delete") setTerritories((p) => p.filter((t) => t.id !== ev.id));
    });
    const unsub2 = base44.entities.FactionEconomy.subscribe((ev) => {
      if (ev.type === "create") setEconomies((p) => [...p, ev.data]);
      else if (ev.type === "update") setEconomies((p) => p.map((e) => (e.id === ev.id ? ev.data : e)));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const factionMap = useMemo(() => {
    const m = {};
    factions.forEach((f) => (m[f.id] = f));
    return m;
  }, [factions]);

  const economyByFaction = useMemo(() => {
    const m = {};
    economies.forEach((e) => (m[e.faction_id] = e));
    return m;
  }, [economies]);

  // Aggregate resource access per faction from controlled territories
  const factionResources = useMemo(() => {
    const result = {};
    factions.forEach((f) => {
      result[f.id] = { fuel: 0, metals: 0, tech: 0, food: 0, munitions: 0 };
    });
    territories.forEach((t) => {
      if (!t.controlling_faction_id || !result[t.controlling_faction_id]) return;
      (t.resources || []).forEach((r) => {
        const key = r.toLowerCase();
        if (result[t.controlling_faction_id][key] !== undefined) {
          result[t.controlling_faction_id][key]++;
        }
      });
    });
    return result;
  }, [territories, factions]);

  // Contested sectors with high-value resources
  const contestedAlerts = useMemo(() => {
    return territories
      .filter((t) => (t.status === "contested" || t.status === "hostile") && t.resources?.length > 0)
      .sort((a, b) => (b.resources?.length || 0) - (a.resources?.length || 0));
  }, [territories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse font-mono">
          LOADING RESOURCE LEDGER...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Resource Ledger
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Faction stockpiles, territory resource acquisition, and contested sector alerts
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Summary ticker */}
      <LedgerSummaryBar
        territories={territories}
        factions={factions}
        economies={economies}
        contestedCount={contestedAlerts.length}
      />

      {/* Contested resource alerts */}
      {contestedAlerts.length > 0 && (
        <ContestedResourceAlerts alerts={contestedAlerts} factionMap={factionMap} />
      )}

      {/* Stockpile bar chart */}
      <StockpileChart
        factions={factions}
        factionResources={factionResources}
        economyByFaction={economyByFaction}
      />

      {/* Faction breakdown cards */}
      <FactionResourceBreakdown
        factions={factions}
        factionResources={factionResources}
        economyByFaction={economyByFaction}
        territories={territories}
      />

      {/* Per-territory resource map */}
      <ResourceByTerritory
        territories={territories}
        factionMap={factionMap}
      />
    </div>
  );
}