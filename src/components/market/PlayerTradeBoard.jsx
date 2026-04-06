import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeftRight, Loader2, MapPin, Coins, Package, TrendingUp, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const rarityColors = {
  common: "text-muted-foreground border-border",
  uncommon: "text-status-ok border-status-ok/30",
  rare: "text-chart-4 border-chart-4/30",
  epic: "text-purple-400 border-purple-400/30",
  legendary: "text-accent border-accent/30",
};

const categoryIcons = {
  weapon: "⚔️", armor: "🛡️", tool: "🔧", consumable: "💊",
  material: "📦", ammo: "🔫", misc: "📎",
};

export default function PlayerTradeBoard({ userEmail, commodities, factions, economies }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [accepting, setAccepting] = useState(null);
  const { toast } = useToast();

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

  const sectors = ["all", ...new Set(trades.map(t => t.sector).filter(Boolean))].sort();
  const categories = ["all", ...new Set(trades.map(t => t.item_category).filter(Boolean))];

  // Get market value context for items
  const getMarketHint = (trade) => {
    if (!commodities || commodities.length === 0) return null;
    const catMap = { material: "metals", ammo: "munitions", consumable: "food", tool: "tech" };
    const commodity = commodities.find(c => c.resource_type === catMap[trade.item_category]);
    if (!commodity) return null;
    const marketValue = commodity.current_price * (trade.quantity || 1);
    if (trade.asking_price <= 0) return null;
    const ratio = trade.asking_price / marketValue;
    if (ratio < 0.7) return { label: "BELOW MARKET", color: "text-status-ok" };
    if (ratio > 1.3) return { label: "ABOVE MARKET", color: "text-status-danger" };
    return { label: "FAIR PRICE", color: "text-muted-foreground" };
  };

  const filtered = trades
    .filter(t => {
      if (t.status !== "open") return false;
      if (t.seller_email === userEmail) return false;
      if (sectorFilter !== "all" && t.sector !== sectorFilter) return false;
      if (categoryFilter !== "all" && t.item_category !== categoryFilter) return false;
      if (search && !t.item_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_low") return (a.asking_price || 0) - (b.asking_price || 0);
      if (sortBy === "price_high") return (b.asking_price || 0) - (a.asking_price || 0);
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const handleAccept = async (trade) => {
    setAccepting(trade.id);
    await base44.entities.TradeOffer.update(trade.id, {
      status: "accepted",
      buyer_email: userEmail,
    });
    await base44.entities.InventoryItem.create({
      owner_email: userEmail,
      name: trade.item_name,
      category: trade.item_category || "misc",
      quantity: trade.quantity || 1,
      rarity: "common",
      value: trade.asking_price || 0,
      source: `Trade from ${trade.seller_callsign || trade.seller_email}`,
      sector: trade.sector,
    });
    toast({ title: "Trade Accepted", description: `Acquired ${trade.quantity || 1}x ${trade.item_name}` });
    setAccepting(null);
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
          {filtered.map(trade => {
            const marketHint = getMarketHint(trade);
            return (
              <div key={trade.id} className="border border-border bg-card rounded-sm p-3 hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px]">{categoryIcons[trade.item_category] || "📎"}</span>
                      <span className="text-[11px] font-semibold font-mono text-foreground">{trade.item_name}</span>
                      {trade.quantity > 1 && (
                        <Badge variant="outline" className="text-[8px]">x{trade.quantity}</Badge>
                      )}
                      {trade.item_category && (
                        <Badge variant="outline" className="text-[7px] uppercase">{trade.item_category}</Badge>
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
                    {trade.asking_items && (
                      <div className="flex items-center gap-1 mt-1.5 bg-accent/5 border border-accent/10 rounded-sm px-2 py-1">
                        <Package className="h-3 w-3 text-accent shrink-0" />
                        <span className="text-[9px] text-accent font-mono">BARTER: {trade.asking_items}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {trade.asking_price > 0 && (
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-primary" />
                        <span className="text-sm font-bold text-primary font-mono">{trade.asking_price}c</span>
                      </div>
                    )}
                    {!trade.asking_price && !trade.asking_items && (
                      <span className="text-[9px] text-status-ok font-mono">FREE</span>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-[9px] uppercase tracking-wider"
                      onClick={() => handleAccept(trade)}
                      disabled={accepting === trade.id}
                    >
                      {accepting === trade.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "ACCEPT"}
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