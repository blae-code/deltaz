import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, MapPin, Coins, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

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
    await base44.entities.TradeOffer.update(id, { status: "cancelled" });
    toast({ title: "Listing cancelled" });
  };

  if (loading) {
    return <p className="text-[10px] text-muted-foreground animate-pulse">Loading your listings...</p>;
  }

  const open = listings.filter(l => l.status === "open");
  const closed = listings.filter(l => l.status !== "open");

  return (
    <div className="space-y-3">
      <DataCard title={`Your Active Listings (${open.length})`}>
        {open.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">No active listings. Post a trade offer to get started.</p>
        ) : (
          <div className="space-y-2">
            {open.map(l => (
              <div key={l.id} className="flex items-center justify-between gap-3 border border-border rounded-sm p-2 bg-secondary/20">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-mono font-semibold text-foreground truncate">{l.item_name}</span>
                    {l.quantity > 1 && <span className="text-[9px] text-muted-foreground">x{l.quantity}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                    {l.sector && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {l.sector}</span>}
                    {l.asking_price > 0 && <span className="flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" /> {l.asking_price}c</span>}
                    {l.asking_items && <span>Wants: {l.asking_items}</span>}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-6 text-[8px] text-destructive border-destructive/20" onClick={() => cancelListing(l.id)}>
                  <X className="h-3 w-3 mr-0.5" /> CANCEL
                </Button>
              </div>
            ))}
          </div>
        )}
      </DataCard>

      {closed.length > 0 && (
        <DataCard title={`Closed Listings (${closed.length})`}>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {closed.map(l => (
              <div key={l.id} className="flex items-center justify-between border border-border/50 rounded-sm p-2 text-[10px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-foreground/70 truncate">{l.item_name}</span>
                  <Badge variant="outline" className={`text-[7px] uppercase ${statusColors[l.status] || ""}`}>
                    {l.status}
                  </Badge>
                </div>
                <span className="text-[8px] text-muted-foreground shrink-0">{moment(l.updated_date).fromNow()}</span>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
}