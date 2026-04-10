import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeftRight, Loader2, MapPin, Coins, Package, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import useGameCatalog from "@/hooks/useGameCatalog";
import { describeTradeFulfillmentGap, formatTradeLineItems, getStructuredTradeOffer } from "@/lib/gameCatalog";

const categoryIcons = {
  weapon: "⚔️", armor: "🛡️", tool: "🔧", consumable: "💊",
  material: "📦", ammo: "🔫", misc: "📎",
};

export default function PlayerTradeBoard({
  userEmail,
  userInventory = [],
  userCredits = 0,
  commodities,
  factions: _factions = [],
  economies: _economies = [],
}) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [accepting, setAccepting] = useState(null);
  const { toast } = useToast();
  const { data: gameItems = [] } = useGameCatalog();

  useEffect(() => {
    base44.entities.TradeOffer.filter({ status: "open" }, "-created_date", 200)
      .then(setTrades)
      .finally(() => setLoading(false));

    const unsub = base44.entities.TradeOffer.subscribe((ev) => {
      if (ev.type === "create" && ev.data.status === "open") setTrades(prev => [ev.data, ...prev]);
      else if (ev.type === "update") setTrades(prev => prev.map(t => t.id === ev.id ? ev.data : t));
      else if (ev.type === "delete") setTrades(prev => prev.filter(t => t.id !== ev.id));
    });
    return unsub;
  }, []);

  const structuredTrades = trades.map((trade) => ({
    raw: trade,
    structured: getStructuredTradeOffer(trade, gameItems),
  }));
  const sectors = ["all", ...new Set(trades.map(t => t.sector).filter(Boolean))].sort();
  const categories = ["all", ...new Set(structuredTrades.map(({ structured }) => {
    const primary = structured.listing_type === "want" ? structured.requested_items?.[0] : structured.offered_items?.[0];
    return primary?.inventory_category || "";
  }).filter(Boolean))];

  // Get market value context for items
  const getMarketHint = (trade, structuredTrade) => {
    if (!commodities || commodities.length === 0) return null;
    const primary = structuredTrade.listing_type === "want" ? structuredTrade.requested_items?.[0] : structuredTrade.offered_items?.[0];
    const category = primary?.inventory_category || trade.item_category;
    const catMap = { material: "metals", ammo: "munitions", consumable: "food", tool: "tech" };
    const commodity = commodities.find(c => c.resource_type === catMap[category]);
    if (!commodity) return null;
    const quantity = primary?.quantity || trade.quantity || 1;
    const marketValue = commodity.current_price * quantity;
    const askingPrice = structuredTrade.listing_type === "want" ? structuredTrade.offered_credits : structuredTrade.requested_credits;
    if (askingPrice <= 0) return null;
    const ratio = askingPrice / marketValue;
    if (ratio < 0.7) return { label: "BELOW MARKET", color: "text-status-ok" };
    if (ratio > 1.3) return { label: "ABOVE MARKET", color: "text-status-danger" };
    return { label: "FAIR PRICE", color: "text-muted-foreground" };
  };

  const filtered = structuredTrades
    .filter(({ raw: t, structured }) => {
      const requestedItems = Array.isArray(structured.requested_items) ? structured.requested_items : [];
      const offeredItems = Array.isArray(structured.offered_items) ? structured.offered_items : [];
      const primaryDisplay = structured.listing_type === "want"
        ? formatTradeLineItems(requestedItems)
        : formatTradeLineItems(offeredItems);
      const primary = structured.listing_type === "want" ? requestedItems[0] : offeredItems[0];
      if (t.status !== "open") return false;
      if (t.seller_email === userEmail) return false;
      if (sectorFilter !== "all" && t.sector !== sectorFilter) return false;
      if (categoryFilter !== "all" && (primary?.inventory_category || t.item_category) !== categoryFilter) return false;
      if (search && !primaryDisplay?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((left, right) => {
      const leftPrice = left.structured.listing_type === "want" ? left.structured.offered_credits : left.structured.requested_credits;
      const rightPrice = right.structured.listing_type === "want" ? right.structured.offered_credits : right.structured.requested_credits;
      if (sortBy === "price_low") return leftPrice - rightPrice;
      if (sortBy === "price_high") return rightPrice - leftPrice;
      return new Date(right.raw.created_date) - new Date(left.raw.created_date);
    });

  const handleSettlement = async (trade) => {
    const structured = getStructuredTradeOffer(trade, gameItems);
    setAccepting(trade.id);
    try {
      await base44.functions.invoke("tradeOps", {
        action: structured.listing_type === "want" ? "fulfill_listing" : "accept_listing",
        listing_id: trade.id,
      });
      toast({
        title: structured.listing_type === "want" ? "Listing Fulfilled" : "Trade Accepted",
        description: "Settlement completed.",
      });
    } catch (error) {
      toast({
        title: "Settlement Failed",
        description: error?.message || "Trade could not be completed.",
        variant: "destructive",
      });
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return <div className="text-primary text-xs tracking-widest animate-pulse text-center py-4">SCANNING TRADE NETWORK...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="h-7 text-[10px] bg-secondary/50 border-border font-mono pl-7"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-7 w-[120px] text-[10px] bg-secondary/50 border-border font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_low">Price ↑</SelectItem>
              <SelectItem value="price_high">Price ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {sectors.map(s => (
              <button
                key={s}
                onClick={() => setSectorFilter(s)}
                className={`text-[8px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-sm border transition-colors ${
                  sectorFilter === s ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {s === "all" ? "ALL SECTORS" : s}
              </button>
            ))}
          </div>
          <span className="text-muted-foreground/30">|</span>
          <div className="flex gap-1 flex-wrap">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`text-[8px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-sm border transition-colors ${
                  categoryFilter === c ? "bg-accent/10 text-accent border-accent/30" : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {c === "all" ? "ALL TYPES" : `${categoryIcons[c] || ""} ${c}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-[9px] text-muted-foreground font-mono">
        {filtered.length} listing{filtered.length !== 1 ? "s" : ""} found
        {sectorFilter !== "all" && ` in ${sectorFilter}`}
        {categoryFilter !== "all" && ` (${categoryFilter})`}
      </div>

      {/* Listings */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 border border-border bg-card rounded-sm">
          <ArrowLeftRight className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">No listings match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ raw: trade, structured }) => {
            const requestedItems = Array.isArray(structured.requested_items) ? structured.requested_items : [];
            const offeredItems = Array.isArray(structured.offered_items) ? structured.offered_items : [];
            const primary = structured.listing_type === "want" ? requestedItems[0] : offeredItems[0];
            const marketHint = getMarketHint(trade, structured);
            const primaryDisplay = structured.listing_type === "want"
              ? formatTradeLineItems(requestedItems)
              : formatTradeLineItems(offeredItems);
            const fulfillmentGap = describeTradeFulfillmentGap(
              userInventory,
              requestedItems,
              userCredits,
              structured.requested_credits,
            );
            return (
              <div key={trade.id} className="border border-border bg-card rounded-sm p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px]">{categoryIcons[primary?.inventory_category] || "📎"}</span>
                      <span className="text-[11px] font-semibold font-mono text-foreground">{primaryDisplay || trade.item_name}</span>
                      {primary?.inventory_category && (
                        <Badge variant="outline" className="text-[7px] uppercase">{primary.inventory_category}</Badge>
                      )}
                      {structured.listing_type === "want" && (
                        <Badge variant="outline" className="text-[7px] uppercase border-accent/30 text-accent">SEEKING</Badge>
                      )}
                      {marketHint && (
                        <span className={`text-[7px] font-mono tracking-wider ${marketHint.color}`}>
                          {marketHint.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[9px] text-muted-foreground font-mono">
                        From: <span className="text-foreground">{trade.seller_callsign || "Anonymous"}</span>
                      </span>
                      {trade.sector && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {trade.sector}
                        </span>
                      )}
                    </div>
                    {/* Barter request */}
                    {structured.listing_type === "offer" && requestedItems.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 bg-accent/5 border border-accent/10 rounded-sm px-2 py-1">
                        <Package className="h-3 w-3 text-accent shrink-0" />
                        <span className="text-[9px] text-accent font-mono">BARTER: {formatTradeLineItems(requestedItems)}</span>
                      </div>
                    )}
                    {structured.listing_type === "want" && offeredItems.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 bg-primary/5 border border-primary/10 rounded-sm px-2 py-1">
                        <Package className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[9px] text-primary font-mono">OFFERING: {formatTradeLineItems(offeredItems)}</span>
                      </div>
                    )}
                    {fulfillmentGap.message && !fulfillmentGap.ok && (
                      <p className="mt-1.5 text-[9px] text-muted-foreground font-mono">{fulfillmentGap.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {(structured.listing_type === "offer" ? structured.requested_credits : structured.offered_credits) > 0 && (
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-primary" />
                        <span className="text-sm font-bold text-primary font-mono">{structured.listing_type === "offer" ? structured.requested_credits : structured.offered_credits}c</span>
                      </div>
                    )}
                    {(structured.listing_type === "offer"
                      ? (!structured.requested_credits && (!structured.requested_items || structured.requested_items.length === 0))
                      : (!structured.offered_credits && (!structured.offered_items || structured.offered_items.length === 0))) && (
                      <span className="text-[9px] text-status-ok font-mono">FREE</span>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-[9px] uppercase tracking-wider"
                      onClick={() => handleSettlement(trade)}
                      disabled={accepting === trade.id || !fulfillmentGap.ok}
                    >
                      {accepting === trade.id ? <Loader2 className="h-3 w-3 animate-spin" /> : structured.listing_type === "offer" ? "ACCEPT" : "FULFILL"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
