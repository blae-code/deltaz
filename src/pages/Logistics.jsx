import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Truck, AlertTriangle } from "lucide-react";
import LogisticsOverview from "../components/logistics/LogisticsOverview";
import FactionSupplyCards from "../components/logistics/FactionSupplyCards";
import ProductionChart from "../components/logistics/ProductionChart";
import EmbargoPanel from "../components/logistics/EmbargoPanel";
import PriorityMatrix from "../components/logistics/PriorityMatrix";

export default function Logistics() {
  const [economies, setEconomies] = useState([]);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.FactionEconomy.list("-created_date", 50),
      base44.entities.Faction.list("name", 50),
      base44.entities.Territory.list("name", 50),
      base44.entities.CommodityPrice.list("resource_type", 10),
    ]).then(([econ, fac, terr, comm]) => {
      setEconomies(econ);
      setFactions(fac);
      setTerritories(terr);
      setCommodities(comm);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">LOADING SUPPLY CHAIN DATA...</div>
      </div>
    );
  }

  // Enrich economies with faction names
  const enriched = economies.map(econ => {
    const faction = factions.find(f => f.id === econ.faction_id);
    return { ...econ, faction_name: faction?.name || "Unknown", faction_tag: faction?.tag || "???", faction_color: faction?.color || "#666", faction_status: faction?.status || "active" };
  });

  const embargoedFactions = enriched.filter(e => e.trade_embargo);
  const activeFactions = enriched.filter(e => e.faction_status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase flex items-center gap-2">
          <Truck className="h-5 w-5" /> Logistics Command
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Supply chain health, resource production, and trade embargo tracking across all factions
        </p>
      </div>

      {/* High-level overview stats */}
      <LogisticsOverview economies={enriched} territories={territories} commodities={commodities} />

      {/* Embargoes alert */}
      {embargoedFactions.length > 0 && <EmbargoPanel embargoed={embargoedFactions} />}

      {/* Production charts */}
      <ProductionChart economies={activeFactions} />

      {/* Priority matrix */}
      <PriorityMatrix economies={enriched} territories={territories} />

      {/* Per-faction supply cards */}
      <FactionSupplyCards economies={enriched} />
    </div>
  );
}