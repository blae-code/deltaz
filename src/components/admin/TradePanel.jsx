import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TradeRouteForm from "./TradeRouteForm";
import TradeRouteList from "./TradeRouteList";
import TradeBalanceChart from "./TradeBalanceChart";

export default function TradePanel() {
  const [routes, setRoutes] = useState([]);
  const [factions, setFactions] = useState([]);
  const [economies, setEconomies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    const [r, f, e] = await Promise.all([
      base44.entities.TradeRoute.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.FactionEconomy.list("-created_date", 50),
    ]);
    setRoutes(r);
    setFactions(f);
    setEconomies(e);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const runTradeCycle = async () => {
    setProcessing(true);
    const res = await base44.functions.invoke("processTrades", {});
    toast({ title: `Trade cycle: ${res.data.executed} route(s) processed` });
    await loadData();
    setProcessing(false);
  };

  const activeRoutes = routes.filter(r => r.status !== "cancelled");
  const activeCount = routes.filter(r => r.status === "active").length;
  const totalRevenue = routes.reduce((s, r) => s + (r.total_revenue || 0), 0);

  if (loading) {
    return <div className="text-[10px] text-primary animate-pulse tracking-widest py-4">LOADING TRADE DATA...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-[10px] font-mono">ROUTES: {activeCount} ACTIVE</Badge>
        <Badge variant="outline" className="text-[10px] font-mono">TOTAL REVENUE: {totalRevenue.toLocaleString()} CR</Badge>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={loadData} className="text-[10px] font-mono h-7">
          <RefreshCw className="h-3 w-3 mr-1" /> REFRESH
        </Button>
        <Button size="sm" onClick={runTradeCycle} disabled={processing || activeCount === 0} className="text-[10px] font-mono h-7">
          {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
          {processing ? "PROCESSING..." : "RUN TRADE CYCLE"}
        </Button>
      </div>

      {/* Trade Balance Chart */}
      {activeRoutes.length > 0 && (
        <div className="border border-border rounded-sm p-4 bg-card">
          <h4 className="text-[10px] font-mono tracking-widest text-muted-foreground mb-3">
            NET TRADE BALANCE PER CYCLE (CR)
          </h4>
          <TradeBalanceChart routes={activeRoutes} factions={factions} />
        </div>
      )}

      {/* Create new route */}
      <div className="border border-border rounded-sm p-4 bg-card">
        <h4 className="text-[10px] font-mono tracking-widest text-muted-foreground mb-3">ESTABLISH NEW ROUTE</h4>
        <TradeRouteForm factions={factions} economies={economies} onCreated={loadData} />
      </div>

      {/* Active routes list */}
      <div className="border border-border rounded-sm p-4 bg-card">
        <h4 className="text-[10px] font-mono tracking-widest text-muted-foreground mb-3">TRADE ROUTES</h4>
        <TradeRouteList routes={activeRoutes} factions={factions} onUpdate={loadData} />
      </div>
    </div>
  );
}