import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import CommodityRow from "../components/market/CommodityRow";
import ModifierBreakdown from "../components/market/ModifierBreakdown";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, RefreshCw, Info, ArrowLeftRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import PlayerTradeBoard from "../components/market/PlayerTradeBoard";

const RESOURCE_ORDER = ["fuel", "metals", "tech", "food", "munitions"];

export default function Market() {
  const [commodities, setCommodities] = useState([]);
  const [diplomacy, setDiplomacy] = useState([]);
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("commodities"); // commodities | player_trades

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.entities.CommodityPrice.list("-updated_date", 20),
      base44.entities.Diplomacy.list("-created_date", 20),
      base44.entities.Faction.list("-created_date", 20),
      base44.auth.me(),
    ])
      .then(([c, d, f, u]) => {
        const sorted = RESOURCE_ORDER.map((rt) => c.find((x) => x.resource_type === rt)).filter(Boolean);
        setCommodities(sorted);
        setDiplomacy(d);
        setFactions(f);
        setUser(u);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.CommodityPrice.subscribe((ev) => {
      if (ev.type === "update" || ev.type === "create") {
        setCommodities((prev) => {
          const updated = prev.map((c) => (c.id === ev.data.id ? ev.data : c));
          if (!prev.find((c) => c.id === ev.data.id)) updated.push(ev.data);
          return RESOURCE_ORDER.map((rt) => updated.find((x) => x.resource_type === rt)).filter(Boolean);
        });
      }
    });
    return unsub;
  }, []);

  // Active trade agreements
  const tradeAgreements = diplomacy.filter(
    (d) => d.status === "trade_agreement" || d.status === "allied"
  );
  const wars = diplomacy.filter((d) => d.status === "war" || d.status === "hostile");
  const getFactionName = (id) => factions.find((f) => f.id === id)?.name || "Unknown";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">LOADING MARKET DATA...</div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
              {tab === "commodities" ? "Commodity Exchange" : "Player Marketplace"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === "commodities"
                ? "Live resource prices — affected by diplomacy, supply chains, and conflict"
                : "Player-to-player trading with sector-based availability"}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={tab === "commodities" ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] uppercase tracking-wider"
              onClick={() => setTab("commodities")}
            >
              <TrendingUp className="h-3 w-3 mr-1" /> COMMODITIES
            </Button>
            <Button
              variant={tab === "player_trades" ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] uppercase tracking-wider"
              onClick={() => setTab("player_trades")}
            >
              <ArrowLeftRight className="h-3 w-3 mr-1" /> P2P MARKET
            </Button>
          </div>
        </div>

        {tab === "player_trades" && (
          <PlayerTradeBoard userEmail={user?.email} />
        )}

        {/* Diplomatic Context Banner */}
        {tab === "commodities" && (tradeAgreements.length > 0 || wars.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {tradeAgreements.map((d) => (
              <Badge
                key={d.id}
                variant="outline"
                className="text-[9px] bg-status-ok/10 text-status-ok border-status-ok/20"
              >
                {getFactionName(d.faction_a_id)} ↔ {getFactionName(d.faction_b_id)}: {d.status === "allied" ? "ALLIANCE" : "TRADE PACT"} ↓ prices
              </Badge>
            ))}
            {wars.map((d) => (
              <Badge
                key={d.id}
                variant="outline"
                className="text-[9px] bg-status-danger/10 text-status-danger border-status-danger/20"
              >
                {getFactionName(d.faction_a_id)} ↔ {getFactionName(d.faction_b_id)}: {d.status.toUpperCase()} ↑ prices
              </Badge>
            ))}
          </div>
        )}

        {tab === "commodities" && <DataCard
          title="Market Board"
          headerRight={
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/50 hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30 max-w-[260px]">
                  <p className="text-primary font-semibold text-[10px] mb-1">PRICE ENGINE</p>
                  <p className="text-muted-foreground">
                    Prices shift based on three factors: diplomatic relations between clans (trade pacts lower prices, wars raise them),
                    supply from production and trade routes, and demand from active conflicts and embargoes. Click any row for a breakdown.
                  </p>
                </TooltipContent>
              </Tooltip>
              <button onClick={loadData} className="text-muted-foreground hover:text-primary transition-colors">
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          }
        >
          {commodities.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No market data yet. An admin needs to run the Commodity Price Engine to initialize prices.
              </p>
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div className="grid grid-cols-12 items-center gap-2 px-3 py-1.5 border-b border-border text-[9px] text-muted-foreground tracking-widest">
                <div className="col-span-3">RESOURCE</div>
                <div className="col-span-2 text-right">PRICE</div>
                <div className="col-span-2 text-right">CHANGE</div>
                <div className="col-span-1 text-center">TREND</div>
                <div className="col-span-2 text-center">SUPPLY</div>
                <div className="col-span-2 text-right">HISTORY</div>
              </div>

              {/* Rows */}
              {commodities.map((c) => (
                <div key={c.id}>
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                  >
                    <CommodityRow commodity={c} />
                  </button>
                  {expandedRow === c.id && (
                    <div className="px-3 py-3 bg-secondary/20 border-b border-border/50 space-y-3">
                      <div className="text-[10px] text-muted-foreground tracking-wider uppercase">
                        Price Modifier Breakdown — {c.resource_type}
                      </div>
                      <ModifierBreakdown commodity={c} />
                      {c.notes && (
                        <p className="text-[10px] text-muted-foreground italic">{c.notes}</p>
                      )}
                      <div className="text-[9px] text-muted-foreground">
                        Base price: {c.base_price} CR · Net modifier: {(((c.current_price / c.base_price) - 1) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DataCard>}

        {/* Legend */}
        {tab === "commodities" && (
        <div className="border border-border bg-card rounded-sm p-4 space-y-2">
          <h4 className="text-[10px] font-mono tracking-widest text-muted-foreground">HOW PRICES WORK</h4>
          <div className="grid md:grid-cols-3 gap-3 text-[10px] text-muted-foreground">
            <div>
              <span className="text-status-ok font-semibold">▼ TRADE AGREEMENTS</span>
              <p className="mt-0.5">When two clans sign a trade pact or alliance, their primary resources become cheaper and more available.</p>
            </div>
            <div>
              <span className="text-status-danger font-semibold">▲ WAR & HOSTILITY</span>
              <p className="mt-0.5">Conflict between clans drives up prices on resources they produce as supply lines are disrupted.</p>
            </div>
            <div>
              <span className="text-primary font-semibold">↔ SUPPLY & DEMAND</span>
              <p className="mt-0.5">Active trade routes increase supply. Contested territories and embargoes increase demand for munitions and fuel.</p>
            </div>
          </div>
        </div>
        )}
      </div>
    </TooltipProvider>
  );
}