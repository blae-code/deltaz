import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import CommodityRow from "../components/market/CommodityRow";
import ModifierBreakdown from "../components/market/ModifierBreakdown";
import MarketPriceContext from "../components/market/MarketPriceContext";
import FactionPriceImpact from "../components/market/FactionPriceImpact";
import PlayerTradeBoard from "../components/market/PlayerTradeBoard";
import MyListings from "../components/market/MyListings";
import CreateTradeForm from "../components/inventory/CreateTradeForm";
import CreateTradeRequest from "../components/trading/CreateTradeRequest";
import TradeRequestList from "../components/trading/TradeRequestList";
import TradeLedger from "../components/trading/TradeLedger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, RefreshCw, Info, Plus, Send,
  ShoppingCart, ScrollText, Package, Handshake,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const RESOURCE_ORDER = ["fuel", "metals", "tech", "food", "munitions"];

export default function Market() {
  const [commodities, setCommodities] = useState([]);
  const [diplomacy, setDiplomacy] = useState([]);
  const [factions, setFactions] = useState([]);
  const [economies, setEconomies] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("browse");
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.entities.CommodityPrice.list("-updated_date", 20),
      base44.entities.Diplomacy.list("-created_date", 20),
      base44.entities.Faction.list("-created_date", 20),
      base44.entities.FactionEconomy.list("-created_date", 20),
      base44.auth.me(),
    ])
      .then(([c, d, f, e, u]) => {
        const sorted = RESOURCE_ORDER.map((rt) => c.find((x) => x.resource_type === rt)).filter(Boolean);
        setCommodities(sorted);
        setDiplomacy(d);
        setFactions(f);
        setEconomies(e);
        setUser(u);
        if (u?.email) {
          base44.entities.InventoryItem.filter({ owner_email: u.email }, "-created_date", 200).then(setInventory);
        }
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

  const tradeAgreements = diplomacy.filter((d) => d.status === "trade_agreement" || d.status === "allied");
  const wars = diplomacy.filter((d) => d.status === "war" || d.status === "hostile");
  const getFactionName = (id) => factions.find((f) => f.id === id)?.name || "Unknown";

  const tabs = [
    { key: "browse", label: "Browse Offers", icon: ShoppingCart },
    { key: "deals", label: "Deals", icon: Handshake },
    { key: "my_listings", label: "My Listings", icon: Package },
    { key: "ledger", label: "Ledger", icon: ScrollText },
    { key: "commodities", label: "Commodities", icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">LOADING MARKET DATA...</div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
              Marketplace
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Trade goods, barter with operatives, and track resource prices across factions
            </p>
          </div>
          <div className="flex gap-1.5">
            {tab === "browse" && (
              <Button
                size="sm"
                className="h-7 text-[10px] uppercase tracking-wider"
                onClick={() => setShowCreateOffer(!showCreateOffer)}
              >
                <Plus className="h-3 w-3 mr-1" /> POST OFFER
              </Button>
            )}
            {tab === "deals" && (
              <Button
                size="sm"
                className="h-7 text-[10px] uppercase tracking-wider"
                onClick={() => setShowCreateDeal(!showCreateDeal)}
              >
                <Send className="h-3 w-3 mr-1" /> NEW PROPOSAL
              </Button>
            )}
          </div>
        </div>

        {/* Market Price Ticker */}
        <MarketPriceContext commodities={commodities} economies={economies} />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setShowCreateOffer(false); setShowCreateDeal(false); }}
              className={`flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono px-2.5 py-1 rounded-sm transition-colors ${
                tab === t.key
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </button>
          ))}
        </div>

        {/* === BROWSE TAB === */}
        {tab === "browse" && (
          <div className="space-y-4">
            {showCreateOffer && (
              <DataCard title="Create Trade Offer">
                <CreateTradeForm
                  items={inventory}
                  userEmail={user?.email}
                  userCallsign={user?.callsign || user?.full_name}
                  onCreated={() => setShowCreateOffer(false)}
                />
              </DataCard>
            )}
            <PlayerTradeBoard
              userEmail={user?.email}
              userInventory={inventory}
              userCredits={user?.credits || 0}
              commodities={commodities}
              factions={factions}
              economies={economies}
            />
          </div>
        )}

        {/* === DEALS TAB === */}
        {tab === "deals" && (
          <div className="space-y-4">
            {showCreateDeal && (
              <DataCard title="New Trade Proposal">
              <CreateTradeRequest
                userEmail={user?.email}
                userCallsign={user?.callsign || user?.full_name}
                items={inventory}
                onCreated={() => setShowCreateDeal(false)}
              />
              </DataCard>
            )}
            <TradeRequestList userEmail={user?.email} userInventory={inventory} userCredits={user?.credits || 0} />
          </div>
        )}

        {/* === MY LISTINGS TAB === */}
        {tab === "my_listings" && (
          <MyListings userEmail={user?.email} />
        )}

        {/* === LEDGER TAB === */}
        {tab === "ledger" && (
          <TradeLedger userEmail={user?.email} />
        )}

        {/* === COMMODITIES TAB === */}
        {tab === "commodities" && (
          <div className="space-y-4">
            {/* Diplomatic Context Banner */}
            {(tradeAgreements.length > 0 || wars.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {tradeAgreements.map((d) => (
                  <Badge key={d.id} variant="outline" className="text-[9px] bg-status-ok/10 text-status-ok border-status-ok/20">
                    {getFactionName(d.faction_a_id)} ↔ {getFactionName(d.faction_b_id)}: {d.status === "allied" ? "ALLIANCE" : "TRADE PACT"} ↓ prices
                  </Badge>
                ))}
                {wars.map((d) => (
                  <Badge key={d.id} variant="outline" className="text-[9px] bg-status-danger/10 text-status-danger border-status-danger/20">
                    {getFactionName(d.faction_a_id)} ↔ {getFactionName(d.faction_b_id)}: {d.status.toUpperCase()} ↑ prices
                  </Badge>
                ))}
              </div>
            )}

            <DataCard
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
                        Prices shift based on diplomatic relations, supply from production and trade routes, and demand from active conflicts.
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
                    No market data yet. An admin needs to run the Commodity Price Engine.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-12 items-center gap-2 px-3 py-1.5 border-b border-border text-[9px] text-muted-foreground tracking-widest">
                    <div className="col-span-3">RESOURCE</div>
                    <div className="col-span-2 text-right">PRICE</div>
                    <div className="col-span-2 text-right">CHANGE</div>
                    <div className="col-span-1 text-center">TREND</div>
                    <div className="col-span-2 text-center">SUPPLY</div>
                    <div className="col-span-2 text-right">HISTORY</div>
                  </div>
                  {commodities.map((c) => (
                    <div key={c.id}>
                      <button className="w-full text-left" onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}>
                        <CommodityRow commodity={c} />
                      </button>
                      {expandedRow === c.id && (
                        <div className="px-3 py-3 bg-secondary/20 border-b border-border/50 space-y-3">
                          <div className="text-[10px] text-muted-foreground tracking-wider uppercase">
                            Price Modifier Breakdown — {c.resource_type}
                          </div>
                          <ModifierBreakdown commodity={c} />
                          {c.notes && <p className="text-[10px] text-muted-foreground italic">{c.notes}</p>}
                          <div className="text-[9px] text-muted-foreground">
                            Base price: {c.base_price} CR · Net modifier: {(((c.current_price / c.base_price) - 1) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </DataCard>

            {/* Faction Economic Impact */}
            <FactionPriceImpact economies={economies} factions={factions} commodities={commodities} />

            {/* Legend */}
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
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
