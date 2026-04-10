import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, X, Check, MapPin, Coins, Package, Handshake, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import InlineConfirm from "../terminal/InlineConfirm";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import useGameCatalog from "@/hooks/useGameCatalog";
import {
  describeTradeFulfillmentGap,
  formatTradeLineItems,
  getStructuredTradeOffer,
} from "@/lib/gameCatalog";

export default function TradeOfferCard({
  trade,
  isOwn,
  userInventory = [],
  userCredits = 0,
  onUpdate = () => {},
  onProposeDeal = null,
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { data: gameItems = [] } = useGameCatalog();
  const structuredTrade = useMemo(
    () => getStructuredTradeOffer(trade, gameItems),
    [trade, gameItems],
  );
  const isWant = structuredTrade.listing_type === "want";
  const requestedItems = Array.isArray(structuredTrade.requested_items) ? structuredTrade.requested_items : [];
  const offeredItems = Array.isArray(structuredTrade.offered_items) ? structuredTrade.offered_items : [];
  const fulfillmentGap = useMemo(
    () => describeTradeFulfillmentGap(
      userInventory,
      requestedItems,
      userCredits,
      structuredTrade.requested_credits,
    ),
    [requestedItems, structuredTrade.requested_credits, userCredits, userInventory],
  );
  const canSettle = !isOwn && fulfillmentGap.ok;
  const primaryDisplay = isWant
    ? formatTradeLineItems(requestedItems)
    : formatTradeLineItems(offeredItems);

  const cancelTrade = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke("tradeOps", {
        action: "cancel_listing",
        listing_id: trade.id,
      });
      toast({ title: isWant ? "Want Listing Removed" : "Trade Cancelled" });
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  const settleTrade = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke("tradeOps", {
        action: isWant ? "fulfill_listing" : "accept_listing",
        listing_id: trade.id,
      });
      toast({
        title: isWant ? "Listing Fulfilled" : "Trade Accepted",
        description: isWant ? "Settlement completed." : `You acquired ${primaryDisplay}`,
      });
      onUpdate();
    } catch (error) {
      toast({
        title: isWant ? "Unable To Fulfill" : "Unable To Accept",
        description: error?.message || "Trade settlement failed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`panel-frame p-2.5 space-y-2 transition-all ${canSettle ? "shadow-[inset_2px_0_0_0_hsl(var(--status-ok))]" : "hover:shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.2)]"}`}>
      {canSettle && (
        <div className="flex items-center gap-1.5 text-[8px] text-status-ok font-mono uppercase tracking-widest">
          <div className="h-1.5 w-1.5 bg-status-ok rounded-full" />
          {isWant ? "You can fulfill this listing" : "You can settle this listing"}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isWant
              ? <Search className="h-3 w-3 text-accent/70 shrink-0" />
              : <Package className="h-3 w-3 text-primary/60 shrink-0" />
            }
            <span className="text-xs font-semibold text-foreground truncate">{primaryDisplay || trade.item_name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="outline" className={`text-[8px] uppercase ${isWant ? "text-accent border-accent/30" : ""}`}>
              {isWant ? "SEEKING" : "LISTED"}
            </Badge>
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

      <div className="space-y-1 text-[10px]">
        {isWant ? (
          <>
            <p className="text-[8px] text-muted-foreground font-mono uppercase tracking-wider">Can offer:</p>
            {structuredTrade.offered_credits > 0 && (
              <div className="flex items-center gap-1 text-accent">
                <Coins className="h-3 w-3" /> {structuredTrade.offered_credits}c
              </div>
            )}
            {offeredItems.length > 0 && (
              <p className="text-muted-foreground">{formatTradeLineItems(offeredItems)}</p>
            )}
            {!structuredTrade.offered_credits && offeredItems.length === 0 && (
              <p className="text-muted-foreground/50 italic text-[9px]">Open to offers</p>
            )}
          </>
        ) : (
          <>
            {structuredTrade.requested_credits > 0 && (
              <div className="flex items-center gap-1 text-accent">
                <Coins className="h-3 w-3" /> {structuredTrade.requested_credits}c
              </div>
            )}
            {requestedItems.length > 0 && (
              <p className="text-muted-foreground">Wants: {formatTradeLineItems(requestedItems)}</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-[8px] text-muted-foreground">
        <span>{isOwn ? "Your listing" : `By ${trade.seller_callsign || "Operative"}`}</span>
        <span>{moment(trade.created_date).fromNow()}</span>
      </div>

      <div className="space-y-1.5">
        {isOwn ? (
          <InlineConfirm
            variant="outline"
            size="sm"
            className="w-full h-6 text-[9px] uppercase tracking-wider text-destructive border-destructive/20"
            confirmLabel={isWant ? "REMOVE LISTING" : "CANCEL LISTING"}
            warning={isWant
              ? `Remove your want listing for ${primaryDisplay || trade.item_name}.`
              : `Remove your listing for ${primaryDisplay || trade.item_name}.`
            }
            severity="warning"
            onConfirm={cancelTrade}
            disabled={loading}
          >
            <X className="h-3 w-3 mr-1" /> CANCEL
          </InlineConfirm>
        ) : (
          <div className="space-y-1.5">
            {fulfillmentGap.message && !canSettle && (
              <p className="text-[8px] text-muted-foreground font-mono">{fulfillmentGap.message}</p>
            )}
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="flex-1 h-6 text-[9px] uppercase tracking-wider"
                onClick={settleTrade}
                disabled={loading || !canSettle}
              >
                <Check className="h-3 w-3 mr-1" /> {isWant ? "FULFILL" : "ACCEPT"}
              </Button>
            {onProposeDeal && (
              <Button
                size="sm"
                variant="outline"
                className={`h-6 text-[9px] uppercase tracking-wider ${isWant ? "flex-1" : ""}`}
                onClick={() => onProposeDeal({ ...trade, ...structuredTrade })}
                disabled={loading}
              >
                <Handshake className="h-3 w-3 mr-1" />
                {isWant ? "COUNTER" : "PROPOSE DEAL"}
              </Button>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
