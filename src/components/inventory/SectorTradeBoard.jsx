import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import TerminalLoader from "../terminal/TerminalLoader";
import TradeOfferCard from "./TradeOfferCard";
import EmptyState from "../terminal/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight, Search } from "lucide-react";

// Checks if the user's inventory contains something matching a want listing's item name.
// Simple substring match — good enough for player-entered data.
function inventoryHasMatch(wantName, inventory) {
  if (!wantName || !inventory?.length) return null;
  const needle = wantName.toLowerCase().replace(/^\d+x\s+/, ""); // strip "2x " prefix
  return inventory.find(i => {
    const haystack = (i.name || "").toLowerCase();
    return haystack.includes(needle) || needle.includes(haystack);
  }) || null;
}

export default function SectorTradeBoard({ userEmail, userInventory = [], onProposeDeal }) {
  const [trades, setTrades] = useState([]);
  const [sectorFilter, setSectorFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [boardTab, setBoardTab] = useState("listings"); // "listings" | "wants"

  const loadTrades = async () => {
    const all = await base44.entities.TradeOffer.filter({ status: "open" }, "-created_date", 100);
    setTrades(all);
    setLoading(false);
  };

  useEffect(() => {
    loadTrades();
    const unsub = base44.entities.TradeOffer.subscribe((event) => {
      if (event.type === "create") setTrades(prev => [event.data, ...prev]);
      else if (event.type === "update") setTrades(prev => prev.map(t => t.id === event.id ? event.data : t).filter(t => t.status === "open"));
      else if (event.type === "delete") setTrades(prev => prev.filter(t => t.id !== event.id));
    });
    return unsub;
  }, []);

  if (loading) {
    return <TerminalLoader size="sm" messages={["SCANNING TRADE BOARD...", "LOADING OFFERS...", "QUERYING LISTINGS..."]} />;
  }

  const filtered = sectorFilter
    ? trades.filter(t => t.sector?.toUpperCase().includes(sectorFilter.toUpperCase()))
    : trades;

  const listings = filtered.filter(t => t.type !== "want");
  const wants = filtered.filter(t => t.type === "want");

  const myListings = listings.filter(t => t.seller_email === userEmail);
  const otherListings = listings.filter(t => t.seller_email !== userEmail);
  const myWants = wants.filter(t => t.seller_email === userEmail);
  const otherWants = wants.filter(t => t.seller_email !== userEmail);

  // How many of the other players' want listings can I supply from my own inventory?
  const suppliableCount = otherWants.filter(t => inventoryHasMatch(t.item_name, userInventory)).length;

  return (
    <div className="space-y-4">
      {/* Tab + filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex">
          <button
            onClick={() => setBoardTab("listings")}
            className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border transition-colors flex items-center gap-1.5 ${
              boardTab === "listings"
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowLeftRight className="h-3 w-3" />
            Listings ({listings.length})
          </button>
          <button
            onClick={() => setBoardTab("wants")}
            className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border border-l-0 transition-colors flex items-center gap-1.5 ${
              boardTab === "wants"
                ? "bg-accent/10 border-accent/40 text-accent"
                : "border-border/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3 w-3" />
            Wants ({wants.length})
            {suppliableCount > 0 && (
              <span className="px-1 py-px text-[8px] bg-status-ok/20 text-status-ok border border-status-ok/30 font-bold">
                {suppliableCount} match
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono shrink-0">SECTOR</Label>
          <Input
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
            placeholder="e.g. B-3"
            className="h-7 text-xs bg-secondary/50 border-border font-mono w-20"
          />
          {filtered.length !== trades.length && (
            <span className="text-[9px] text-muted-foreground">{filtered.length} shown</span>
          )}
        </div>
      </div>

      {boardTab === "listings" ? (
        <div className="space-y-4">
          {myListings.length > 0 && (
            <DataCard title={`Your Listings (${myListings.length})`}>
              <div className="grid md:grid-cols-2 gap-2">
                {myListings.map(t => (
                  <TradeOfferCard key={t.id} trade={t} isOwn onUpdate={loadTrades} />
                ))}
              </div>
            </DataCard>
          )}

          <DataCard title={`Available (${otherListings.length})`}>
            {otherListings.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="No Listings"
                why="No other operatives have posted trade offers yet."
                action="Check back later, or post a Want listing so others know what you're after."
              />
            ) : (
              <div className="grid md:grid-cols-2 gap-2">
                {otherListings.map(t => (
                  <TradeOfferCard
                    key={t.id}
                    trade={t}
                    isOwn={false}
                    userEmail={userEmail}
                    onUpdate={loadTrades}
                    onProposeDeal={onProposeDeal}
                  />
                ))}
              </div>
            )}
          </DataCard>
        </div>
      ) : (
        <div className="space-y-4">
          {suppliableCount > 0 && (
            <div className="panel-frame px-3 py-2 flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-status-ok rounded-full shrink-0" />
              <p className="text-[10px] text-status-ok font-mono">
                You have inventory items matching <span className="font-bold">{suppliableCount}</span> want listing{suppliableCount > 1 ? "s" : ""} — highlighted below.
              </p>
            </div>
          )}

          {myWants.length > 0 && (
            <DataCard title={`Your Want Listings (${myWants.length})`}>
              <div className="grid md:grid-cols-2 gap-2">
                {myWants.map(t => (
                  <TradeOfferCard key={t.id} trade={t} isOwn onUpdate={loadTrades} />
                ))}
              </div>
            </DataCard>
          )}

          <DataCard title={`Others Seeking (${otherWants.length})`}>
            {otherWants.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No Want Listings"
                why="No one has posted what they're looking for yet."
                action={`Switch to "I'm Seeking" mode when posting to add a want listing.`}
              />
            ) : (
              <div className="grid md:grid-cols-2 gap-2">
                {otherWants.map(t => (
                  <TradeOfferCard
                    key={t.id}
                    trade={t}
                    isOwn={false}
                    userEmail={userEmail}
                    userInventory={userInventory}
                    onUpdate={loadTrades}
                    onProposeDeal={onProposeDeal}
                  />
                ))}
              </div>
            )}
          </DataCard>
        </div>
      )}
    </div>
  );
}
