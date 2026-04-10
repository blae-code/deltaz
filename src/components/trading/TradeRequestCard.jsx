import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, ArrowRight, Coins, Package, Clock, MessageCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import InlineConfirm from "../terminal/InlineConfirm";
import moment from "moment";
import useGameCatalog from "@/hooks/useGameCatalog";
import { describeTradeFulfillmentGap, formatTradeLineItems, getStructuredTradeRequest } from "@/lib/gameCatalog";
import TradeLineItemsEditor from "./TradeLineItemsEditor";

const statusColors = {
  pending: "bg-accent/20 text-accent border-accent/30",
  accepted: "bg-status-ok/20 text-status-ok border-status-ok/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  expired: "bg-muted text-muted-foreground border-border",
};

export default function TradeRequestCard({ trade, userEmail, userInventory = [], userCredits = 0, onUpdate = () => {} }) {
  const [responding, setResponding] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const { toast } = useToast();
  const { data: gameItems = [] } = useGameCatalog();
  const structuredTrade = useMemo(
    () => getStructuredTradeRequest(trade, gameItems),
    [trade, gameItems],
  );
  const offeredItems = Array.isArray(structuredTrade.offered_items) ? structuredTrade.offered_items : [];
  const requestedItems = Array.isArray(structuredTrade.requested_items) ? structuredTrade.requested_items : [];

  const [counterOfferedItems, setCounterOfferedItems] = useState(requestedItems);
  const [counterOfferedCredits, setCounterOfferedCredits] = useState(structuredTrade.requested_credits || 0);
  const [counterRequestedItems, setCounterRequestedItems] = useState(offeredItems);
  const [counterRequestedCredits, setCounterRequestedCredits] = useState(structuredTrade.offered_credits || 0);
  const [counterMessage, setCounterMessage] = useState("");

  const isSender = trade.sender_email === userEmail;
  const isReceiver = trade.receiver_email === userEmail;
  const isPending = trade.status === "pending";
  const isExpired = trade.expires_at && new Date(trade.expires_at) < new Date() && isPending;
  const displayStatus = isExpired ? "expired" : trade.status;
  const fulfillmentGap = useMemo(
    () => describeTradeFulfillmentGap(
      userInventory,
      requestedItems,
      userCredits,
      structuredTrade.requested_credits,
    ),
    [requestedItems, structuredTrade.requested_credits, userCredits, userInventory],
  );

  const respond = async (action) => {
    setResponding(true);
    try {
      await base44.functions.invoke("tradeOps", {
        action: "respond_request",
        request_id: trade.id,
        response_action: action,
        response_message: responseMsg.trim(),
      });
      toast({ title: action === "accepted" ? "Trade Accepted!" : action === "rejected" ? "Trade Rejected" : "Trade Cancelled" });
      onUpdate();
    } catch (error) {
      toast({
        title: action === "accepted" ? "Unable To Accept" : "Trade Update Failed",
        description: error?.message || "Trade request could not be updated.",
        variant: "destructive",
      });
    } finally {
      setResponding(false);
      setShowResponse(false);
    }
  };

  const submitCounter = async () => {
    const hasOffer = counterOfferedItems.length > 0 || counterOfferedCredits > 0;
    const hasRequest = counterRequestedItems.length > 0 || counterRequestedCredits > 0;
    if (!hasOffer && !hasRequest) {
      toast({ title: "Invalid Counter", description: "Must offer or request something.", variant: "destructive" });
      return;
    }

    setResponding(true);
    try {
      await base44.functions.invoke("tradeOps", {
        action: "counter_request",
        request_id: trade.id,
        offered_items: counterOfferedItems,
        offered_credits: counterOfferedCredits,
        requested_items: counterRequestedItems,
        requested_credits: counterRequestedCredits,
        message: counterMessage.trim() || "Counter-offer",
      });
      toast({ title: "Counter-Offer Sent", description: `${trade.sender_callsign || trade.sender_email} has been notified.` });
      onUpdate();
      setShowCounter(false);
    } finally {
      setResponding(false);
    }
  };

  const offeredText = formatTradeLineItems(offeredItems);
  const requestedText = formatTradeLineItems(requestedItems);

  return (
    <div className="panel-frame p-3 space-y-2 hover:shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.2)] transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-primary font-semibold">{isSender ? "You" : trade.sender_callsign}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-accent font-semibold">{isReceiver ? "You" : trade.receiver_callsign}</span>
        </div>
        <Badge className={`text-[8px] uppercase border ${statusColors[displayStatus] || statusColors.pending}`}>
          {displayStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-primary/5 border border-primary/10 p-1.5">
          <p className="text-[8px] text-primary font-mono uppercase tracking-wider mb-1">Offering</p>
          {offeredText && (
            <div className="flex items-start gap-1 text-[10px] text-foreground">
              <Package className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
              <span>{offeredText}</span>
            </div>
          )}
          {structuredTrade.offered_credits > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-accent">
              <Coins className="h-3 w-3" /> {structuredTrade.offered_credits}c
            </div>
          )}
          {!offeredText && !structuredTrade.offered_credits && (
            <span className="text-[9px] text-muted-foreground italic">Nothing</span>
          )}
        </div>
        <div className="bg-accent/5 border border-accent/10 p-1.5">
          <p className="text-[8px] text-accent font-mono uppercase tracking-wider mb-1">Requesting</p>
          {requestedText && (
            <div className="flex items-start gap-1 text-[10px] text-foreground">
              <Package className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
              <span>{requestedText}</span>
            </div>
          )}
          {structuredTrade.requested_credits > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-accent">
              <Coins className="h-3 w-3" /> {structuredTrade.requested_credits}c
            </div>
          )}
          {!requestedText && !structuredTrade.requested_credits && (
            <span className="text-[9px] text-muted-foreground italic">Nothing</span>
          )}
        </div>
      </div>

      {trade.message && (
        <div className="flex items-start gap-1.5 text-[9px] text-muted-foreground bg-secondary/30 p-1.5">
          <MessageCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>"{trade.message}"</span>
        </div>
      )}

      {trade.settlement_error && (
        <div className="text-[9px] text-destructive font-mono bg-destructive/5 border border-destructive/20 p-1.5">
          {trade.settlement_error}
        </div>
      )}

      {trade.response_message && (
        <div className="flex items-start gap-1.5 text-[9px] text-foreground bg-secondary/50 p-1.5">
          <MessageCircle className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
          <span>Reply: "{trade.response_message}"</span>
        </div>
      )}

      <div className="flex items-center justify-between text-[8px] text-muted-foreground">
        <span>{moment(trade.created_date).fromNow()}</span>
        {trade.expires_at && isPending && !isExpired && (
          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" /> Expires {moment(trade.expires_at).fromNow()}
          </span>
        )}
        {trade.resolved_at && (
          <span>Resolved {moment(trade.resolved_at).fromNow()}</span>
        )}
      </div>

      {isPending && !isExpired && (
        <div className="pt-1 space-y-2">
          {isReceiver && !showCounter && (
            <>
              {fulfillmentGap.message && !fulfillmentGap.ok && (
                <p className="text-[8px] text-muted-foreground font-mono">{fulfillmentGap.message}</p>
              )}
              {showResponse && (
                <Input
                  value={responseMsg}
                  onChange={(event) => setResponseMsg(event.target.value)}
                  placeholder="Optional reply message..."
                  className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
                />
              )}
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 h-6 text-[9px] uppercase tracking-wider"
                  onClick={() => showResponse ? respond("accepted") : setShowResponse(true)}
                  disabled={responding || !fulfillmentGap.ok}
                >
                  <Check className="h-3 w-3 mr-1" /> ACCEPT
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-6 text-[9px] uppercase tracking-wider"
                  onClick={() => { setShowCounter(true); setShowResponse(false); }}
                  disabled={responding}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> COUNTER
                </Button>
                <InlineConfirm
                  variant="outline"
                  size="sm"
                  className="flex-1 h-6 text-[9px] uppercase tracking-wider text-destructive border-destructive/20"
                  confirmLabel="REJECT TRADE"
                  warning="The sender will be notified."
                  severity="warning"
                  onConfirm={() => respond("rejected")}
                  disabled={responding}
                >
                  <X className="h-3 w-3 mr-1" /> REJECT
                </InlineConfirm>
              </div>
            </>
          )}

          {isSender && !showCounter && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[9px] uppercase tracking-wider text-muted-foreground"
              onClick={() => respond("cancelled")}
              disabled={responding}
            >
              <X className="h-3 w-3 mr-1" /> CANCEL PROPOSAL
            </Button>
          )}

          {showCounter && isReceiver && (
            <div className="border-t border-border/50 pt-3 space-y-3">
              <p className="text-[9px] font-mono text-chart-4 uppercase tracking-widest">// COUNTER OFFER</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="border border-primary/20 bg-primary/5 p-2.5">
                  <TradeLineItemsEditor
                    label="Counter Offer"
                    catalog={gameItems}
                    value={counterOfferedItems}
                    onChange={setCounterOfferedItems}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={counterOfferedCredits}
                    onChange={(event) => setCounterOfferedCredits(Math.max(0, parseInt(event.target.value, 10) || 0))}
                    placeholder="Credits"
                    className="h-6 text-[9px] bg-secondary/50 border-border font-mono mt-2"
                  />
                </div>
                <div className="border border-accent/20 bg-accent/5 p-2.5">
                  <TradeLineItemsEditor
                    label="Counter Request"
                    catalog={gameItems}
                    value={counterRequestedItems}
                    onChange={setCounterRequestedItems}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={counterRequestedCredits}
                    onChange={(event) => setCounterRequestedCredits(Math.max(0, parseInt(event.target.value, 10) || 0))}
                    placeholder="Credits"
                    className="h-6 text-[9px] bg-secondary/50 border-border font-mono mt-2"
                  />
                </div>
              </div>

              <Input
                value={counterMessage}
                onChange={(event) => setCounterMessage(event.target.value)}
                placeholder="Note to sender (optional)..."
                className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
              />

              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 h-6 text-[9px] uppercase tracking-wider"
                  onClick={submitCounter}
                  disabled={responding}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {responding ? "SENDING..." : "SEND COUNTER"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[9px] uppercase tracking-wider text-muted-foreground"
                  onClick={() => setShowCounter(false)}
                  disabled={responding}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
