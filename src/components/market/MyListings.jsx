import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, MapPin, Coins, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import useGameCatalog from "@/hooks/useGameCatalog";
import { formatTradeLineItems, getStructuredTradeOffer } from "@/lib/gameCatalog";

const statusColors = {
  open: "text-status-ok border-status-ok/30",
  accepted: "text-primary border-primary/30",
  cancelled: "text-muted-foreground border-border",
  expired: "text-muted-foreground border-border",
};

export default function MyListings({ userEmail }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { data: gameItems = [] } = useGameCatalog();

  useEffect(() => {
    base44.entities.TradeOffer.filter({ seller_email: userEmail }, "-created_date", 50)
      .then(setListings)
      .finally(() => setLoading(false));

    const unsub = base44.entities.TradeOffer.subscribe((ev) => {
      if (ev.type === "create" && ev.data.seller_email === userEmail) {
        setListings(prev => [ev.data, ...prev]);
      } else if (ev.type === "update") {
        setListings(prev => prev.map(l => l.id === ev.id ? ev.data : l));
      } else if (ev.type === "delete") {
        setListings(prev => prev.filter(l => l.id !== ev.id));
      }
    });
    return unsub;
  }, [userEmail]);

  const cancelListing = async (id) => {
    await base44.functions.invoke("tradeOps", {
      action: "cancel_listing",
      listing_id: id,
    });
    toast({ title: "Listing cancelled" });
  };

  if (loading) {
    return <p className="text-[10px] text-muted-foreground animate-pulse">Loading your listings...</p>;
  }

  const open = listings.filter(l => l.status === "open");
  const closed = listings.filter(l => l.status !== "open");
  const structuredOpenListings = open.map((listing) => ({
    raw: listing,
    structured: getStructuredTradeOffer(listing, gameItems),
  }));
  const structuredClosedListings = closed.map((listing) => ({
    raw: listing,
    structured: getStructuredTradeOffer(listing, gameItems),
  }));

  return (
    <div className="space-y-3">
      <DataCard title={`Your Active Listings (${open.length})`}>
        {open.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">No active listings. Post a trade offer to get started.</p>
        ) : (
          <div className="space-y-2">
            {structuredOpenListings.map(({ raw: listing, structured }) => {
              const primaryDisplay = structured.listing_type === "want"
                ? formatTradeLineItems(structured.requested_items)
                : formatTradeLineItems(structured.offered_items);
              return (
                <div key={listing.id} className="flex items-center justify-between gap-3 border border-border rounded-sm p-2 bg-secondary/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] font-mono font-semibold text-foreground truncate">{primaryDisplay || listing.item_name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                      {listing.sector && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {listing.sector}</span>}
                      {structured.listing_type === "offer" && structured.requested_credits > 0 && <span className="flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" /> {structured.requested_credits}c</span>}
                      {structured.listing_type === "want" && structured.offered_credits > 0 && <span className="flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" /> {structured.offered_credits}c</span>}
                      {structured.listing_type === "offer" && structured.requested_items?.length > 0 && <span>Wants: {formatTradeLineItems(structured.requested_items)}</span>}
                      {structured.listing_type === "want" && structured.offered_items?.length > 0 && <span>Offering: {formatTradeLineItems(structured.offered_items)}</span>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-6 text-[8px] text-destructive border-destructive/20" onClick={() => cancelListing(listing.id)}>
                    <X className="h-3 w-3 mr-0.5" /> CANCEL
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DataCard>

      {closed.length > 0 && (
        <DataCard title={`Closed Listings (${closed.length})`}>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {structuredClosedListings.map(({ raw: listing, structured }) => {
              const primaryDisplay = structured.listing_type === "want"
                ? formatTradeLineItems(structured.requested_items)
                : formatTradeLineItems(structured.offered_items);
              return (
                <div key={listing.id} className="flex items-center justify-between border border-border/50 rounded-sm p-2 text-[10px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-foreground/70 truncate">{primaryDisplay || listing.item_name}</span>
                    <Badge variant="outline" className={`text-[7px] uppercase ${statusColors[listing.status] || ""}`}>
                      {listing.status}
                    </Badge>
                  </div>
                  <span className="text-[8px] text-muted-foreground shrink-0">{moment(listing.updated_date).fromNow()}</span>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
}
