import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeftRight, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const rarityColors = {
  common: "text-muted-foreground",
  uncommon: "text-status-ok",
  rare: "text-chart-4",
  epic: "text-purple-400",
  legendary: "text-accent",
};

export default function PlayerTradeBoard({ userEmail }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [accepting, setAccepting] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.TradeOffer.filter({ status: "open" }, "-created_date", 100)
      .then(setTrades)
      .finally(() => setLoading(false));

    const unsub = base44.entities.TradeOffer.subscribe((ev) => {
      if (ev.type === "create") setTrades(prev => [ev.data, ...prev]);
      else if (ev.type === "update") setTrades(prev => prev.map(t => t.id === ev.id ? ev.data : t));
      else if (ev.type === "delete") setTrades(prev => prev.filter(t => t.id !== ev.id));
    });
    return unsub;
  }, []);

  const sectors = ["all", ...new Set(trades.map(t => t.sector).filter(Boolean))];

  const filtered = trades.filter(t => {
    if (t.seller_email === userEmail) return false; // Don't show own trades
    if (sectorFilter !== "all" && t.sector !== sectorFilter) return false;
    if (search && !t.item_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAccept = async (trade) => {
    setAccepting(trade.id);
    await base44.entities.TradeOffer.update(trade.id, {
      status: "accepted",
      buyer_email: userEmail,
    });

    // Transfer item to buyer
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
      {/* Search & filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono pl-7"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {sectors.map(s => (
            <button
              key={s}
              onClick={() => setSectorFilter(s)}
              className={`text-[8px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-sm border ${
                sectorFilter === s ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {s === "all" ? "ALL" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Listings */}
      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <ArrowLeftRight className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">No open trade listings found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(trade => (
            <div key={trade.id} className="border border-border bg-card rounded-sm p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold font-mono text-foreground">{trade.item_name}</span>
                    {trade.quantity > 1 && <span className="text-[9px] text-muted-foreground">x{trade.quantity}</span>}
                    {trade.item_category && (
                      <Badge variant="outline" className="text-[8px] uppercase">{trade.item_category}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] text-muted-foreground font-mono">
                      Seller: {trade.seller_callsign || "Anonymous"}
                    </span>
                    {trade.sector && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {trade.sector}
                      </span>
                    )}
                  </div>
                  {trade.asking_items && (
                    <p className="text-[9px] text-accent mt-1">Wants: {trade.asking_items}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {trade.asking_price > 0 && (
                    <span className="text-xs font-bold text-primary font-mono">{trade.asking_price}c</span>
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
          ))}
        </div>
      )}
    </div>
  );
}