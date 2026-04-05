import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import TradeOfferCard from "./TradeOfferCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SectorTradeBoard({ userEmail }) {
  const [trades, setTrades] = useState([]);
  const [sectorFilter, setSectorFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTrades = async () => {
    const all = await base44.entities.TradeOffer.filter({ status: "open" }, "-created_date", 100);
    setTrades(all);
    setLoading(false);
  };

  useEffect(() => {
    loadTrades();
    const unsub = base44.entities.TradeOffer.subscribe((event) => {
      if (event.type === "create") {
        setTrades(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setTrades(prev => prev.map(t => t.id === event.id ? event.data : t).filter(t => t.status === "open"));
      } else if (event.type === "delete") {
        setTrades(prev => prev.filter(t => t.id !== event.id));
      }
    });
    return unsub;
  }, []);

  const filtered = sectorFilter
    ? trades.filter(t => t.sector?.toUpperCase().includes(sectorFilter.toUpperCase()))
    : trades;

  const myOffers = filtered.filter(t => t.seller_email === userEmail);
  const otherOffers = filtered.filter(t => t.seller_email !== userEmail);

  if (loading) {
    return <p className="text-[10px] text-muted-foreground animate-pulse">Loading trade board...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono shrink-0">FILTER SECTOR</Label>
        <Input
          value={sectorFilter}
          onChange={e => setSectorFilter(e.target.value)}
          placeholder="e.g. B-3"
          className="h-7 text-xs bg-secondary/50 border-border font-mono w-28"
        />
        <span className="text-[9px] text-muted-foreground">{filtered.length} offers</span>
      </div>

      {/* My offers */}
      {myOffers.length > 0 && (
        <DataCard title={`Your Listings (${myOffers.length})`}>
          <div className="grid md:grid-cols-2 gap-2">
            {myOffers.map(t => (
              <TradeOfferCard key={t.id} trade={t} isOwn={true} onUpdate={loadTrades} />
            ))}
          </div>
        </DataCard>
      )}

      {/* Other offers */}
      <DataCard title={`Available Trades (${otherOffers.length})`}>
        {otherOffers.length === 0 ? (
          <p className="text-[10px] text-muted-foreground py-4 text-center">
            No trade offers in {sectorFilter || "any sector"}. Post your own to start trading!
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-2">
            {otherOffers.map(t => (
              <TradeOfferCard key={t.id} trade={t} isOwn={false} userEmail={userEmail} onUpdate={loadTrades} />
            ))}
          </div>
        )}
      </DataCard>
    </div>
  );
}