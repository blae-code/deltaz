import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, X, Check, MapPin, Coins, Package, Handshake, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import InlineConfirm from "../terminal/InlineConfirm";
import moment from "moment";

// Returns the matching inventory item if the user has something for this want listing.
function findInventoryMatch(wantName, inventory) {
  if (!wantName || !inventory?.length) return null;
  const needle = wantName.toLowerCase().replace(/^\d+x\s+/, "");
  return inventory.find(i => {
    const h = (i.name || "").toLowerCase();
    return h.includes(needle) || needle.includes(h);
  }) || null;
}

export default function TradeOfferCard({ trade, isOwn, userEmail, userInventory = [], onUpdate, onProposeDeal }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isWant = trade.type === "want";
  const matchingItem = !isOwn && isWant ? findInventoryMatch(trade.item_name, userInventory) : null;

  const cancelTrade = async () => {
    setLoading(true);
    await base44.entities.TradeOffer.update(trade.id, { status: "cancelled" });
    toast({ title: isWant ? "Want Listing Removed" : "Trade Cancelled" });
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
    <div className={`panel-frame p-2.5 space-y-2 ${matchingItem ? "shadow-[inset_2px_0_0_0_hsl(var(--status-ok))]" : ""}`}>
      {/* YOU HAVE THIS badge for matching want listings */}
      {matchingItem && (
        <div className="flex items-center gap-1.5 text-[8px] text-status-ok font-mono uppercase tracking-widest">
          <div className="h-1.5 w-1.5 bg-status-ok rounded-full" />
          You have: {matchingItem.name} x{matchingItem.quantity || 1}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isWant
              ? <Search className="h-3 w-3 text-accent/70 shrink-0" />
              : <Package className="h-3 w-3 text-primary/60 shrink-0" />
            }
            <span className="text-xs font-semibold text-foreground truncate">{trade.item_name}</span>
            {trade.quantity > 1 && <span className="text-[9px] text-muted-foreground">x{trade.quantity}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {trade.item_category && !isWant && (
              <Badge variant="outline" className="text-[8px] uppercase">{trade.item_category}</Badge>
            )}
            {isWant && (
              <Badge variant="outline" className="text-[8px] uppercase text-accent border-accent/30">SEEKING</Badge>
            )}
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" /> {trade.sector}
            </span>
          </div>
        </div>
        {isWant
          ? <Search className="h-3.5 w-3.5 text-accent/40 shrink-0" />
          : <ArrowLeftRight className="h-3.5 w-3.5 text-accent shrink-0" />
        }
      </div>

      {/* Price / offer */}
      <div className="space-y-1 text-[10px]">
        {isWant ? (
          <>
            <p className="text-[8px] text-muted-foreground font-mono uppercase tracking-wider">Can offer:</p>
            {trade.asking_price > 0 && (
              <div className="flex items-center gap-1 text-accent">
                <Coins className="h-3 w-3" /> {trade.asking_price}c
              </div>
            )}
            {trade.asking_items && <p className="text-muted-foreground">{trade.asking_items}</p>}
            {!trade.asking_price && !trade.asking_items && (
              <p className="text-muted-foreground/50 italic text-[9px]">Open to offers</p>
            )}
          </>
        ) : (
          <>
            {trade.asking_price > 0 && (
              <div className="flex items-center gap-1 text-accent">
                <Coins className="h-3 w-3" /> {trade.asking_price}c
              </div>
            )}
            {trade.asking_items && <p className="text-muted-foreground">Wants: {trade.asking_items}</p>}
          </>
        )}
      </div>

      {/* Seller + time */}
      <div className="flex items-center justify-between text-[8px] text-muted-foreground">
        <span>{isOwn ? "Your listing" : `By ${trade.seller_callsign || "Operative"}`}</span>
        <span>{moment(trade.created_date).fromNow()}</span>
      </div>

      {/* Actions */}
      <div className="space-y-1.5">
        {isOwn ? (
          <InlineConfirm
            variant="outline"
            size="sm"
            className="w-full h-6 text-[9px] uppercase tracking-wider text-destructive border-destructive/20"
            confirmLabel={isWant ? "REMOVE LISTING" : "CANCEL LISTING"}
            warning={isWant
              ? `Remove your want listing for ${trade.item_name}.`
              : `Remove your listing for ${trade.item_name}. The item stays in your inventory.`
            }
            severity="warning"
            onConfirm={cancelTrade}
            disabled={loading}
          >
            <X className="h-3 w-3 mr-1" /> CANCEL
          </InlineConfirm>
        ) : (
          <div className="flex gap-1.5">
            {/* Straight accept — only for regular listings */}
            {!isWant && (
              <Button
                size="sm"
                className="flex-1 h-6 text-[9px] uppercase tracking-wider"
                onClick={acceptTrade}
                disabled={loading}
              >
                <Check className="h-3 w-3 mr-1" /> ACCEPT
              </Button>
            )}
            {/* Propose Deal / I Can Supply */}
            {onProposeDeal && (
              <Button
                size="sm"
                variant={matchingItem ? "default" : "outline"}
                className={`h-6 text-[9px] uppercase tracking-wider ${isWant ? "flex-1" : ""} ${matchingItem ? "border-status-ok/40 bg-status-ok/10 text-status-ok hover:bg-status-ok/20" : ""}`}
                onClick={() => onProposeDeal(trade)}
                disabled={loading}
              >
                <Handshake className="h-3 w-3 mr-1" />
                {isWant ? "I CAN SUPPLY" : "PROPOSE DEAL"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
