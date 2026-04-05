import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, X, Check, MapPin, Coins } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function TradeOfferCard({ trade, isOwn, userEmail, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const cancelTrade = async () => {
    setLoading(true);
    await base44.entities.TradeOffer.update(trade.id, { status: "cancelled" });
    toast({ title: "Trade Cancelled" });
    onUpdate?.();
    setLoading(false);
  };

  const acceptTrade = async () => {
    setLoading(true);
    await base44.entities.TradeOffer.update(trade.id, { status: "accepted", buyer_email: userEmail });
    toast({ title: "Trade Accepted!", description: `You acquired ${trade.item_name}` });
    onUpdate?.();
    setLoading(false);
  };

  return (
    <div className="border border-border rounded-sm p-2.5 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">{trade.item_name}</span>
            {trade.quantity > 1 && <span className="text-[9px] text-muted-foreground">x{trade.quantity}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {trade.item_category && (
              <Badge variant="outline" className="text-[8px] uppercase">{trade.item_category}</Badge>
            )}
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" /> {trade.sector}
            </span>
          </div>
        </div>
        <ArrowLeftRight className="h-3.5 w-3.5 text-accent shrink-0" />
      </div>

      {/* Price / Want */}
      <div className="mt-2 space-y-1">
        {trade.asking_price > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-accent">
            <Coins className="h-3 w-3" /> {trade.asking_price}c
          </div>
        )}
        {trade.asking_items && (
          <p className="text-[9px] text-muted-foreground">Wants: {trade.asking_items}</p>
        )}
      </div>

      {/* Seller + Time */}
      <div className="flex items-center justify-between mt-2 text-[8px] text-muted-foreground">
        <span>{isOwn ? "Your listing" : `By ${trade.seller_callsign || "Unknown"}`}</span>
        <span>{moment(trade.created_date).fromNow()}</span>
      </div>

      {/* Actions */}
      <div className="mt-2">
        {isOwn ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-6 text-[9px] uppercase tracking-wider text-destructive border-destructive/20"
            onClick={cancelTrade}
            disabled={loading}
          >
            <X className="h-3 w-3 mr-1" /> CANCEL
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full h-6 text-[9px] uppercase tracking-wider"
            onClick={acceptTrade}
            disabled={loading}
          >
            <Check className="h-3 w-3 mr-1" /> ACCEPT TRADE
          </Button>
        )}
      </div>
    </div>
  );
}