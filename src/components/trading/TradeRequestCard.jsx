import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, ArrowRight, Coins, Package, Clock, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import InlineConfirm from "../terminal/InlineConfirm";
import moment from "moment";

const statusColors = {
  pending: "bg-accent/20 text-accent border-accent/30",
  accepted: "bg-status-ok/20 text-status-ok border-status-ok/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  expired: "bg-muted text-muted-foreground border-border",
};

export default function TradeRequestCard({ trade, userEmail, onUpdate }) {
  const [responding, setResponding] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const { toast } = useToast();

  const isSender = trade.sender_email === userEmail;
  const isReceiver = trade.receiver_email === userEmail;
  const isPending = trade.status === "pending";
  const isExpired = trade.expires_at && new Date(trade.expires_at) < new Date() && isPending;

  const respond = async (action) => {
    setResponding(true);
    await base44.entities.TradeRequest.update(trade.id, {
      status: action,
      response_message: responseMsg.trim() || undefined,
      resolved_at: new Date().toISOString(),
    });
    toast({ title: action === "accepted" ? "Trade Accepted!" : "Trade Rejected" });
    onUpdate?.();
    setResponding(false);
    setShowResponse(false);
  };

  const cancel = async () => {
    setResponding(true);
    await base44.entities.TradeRequest.update(trade.id, {
      status: "cancelled",
      resolved_at: new Date().toISOString(),
    });
    toast({ title: "Trade Cancelled" });
    onUpdate?.();
    setResponding(false);
  };

  const displayStatus = isExpired ? "expired" : trade.status;

  return (
    <div className="border border-border rounded-sm p-3 bg-card space-y-2">
      {/* Header */}
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

      {/* Trade contents */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-primary/5 border border-primary/10 rounded-sm p-1.5">
          <p className="text-[8px] text-primary font-mono uppercase tracking-wider mb-1">Offering</p>
          {trade.offer_items && (
            <div className="flex items-start gap-1 text-[10px] text-foreground">
              <Package className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
              <span>{trade.offer_items}</span>
            </div>
          )}
          {trade.offer_credits > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-accent">
              <Coins className="h-3 w-3" /> {trade.offer_credits}c
            </div>
          )}
          {!trade.offer_items && !trade.offer_credits && (
            <span className="text-[9px] text-muted-foreground italic">Nothing</span>
          )}
        </div>
        <div className="bg-accent/5 border border-accent/10 rounded-sm p-1.5">
          <p className="text-[8px] text-accent font-mono uppercase tracking-wider mb-1">Requesting</p>
          {trade.request_items && (
            <div className="flex items-start gap-1 text-[10px] text-foreground">
              <Package className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
              <span>{trade.request_items}</span>
            </div>
          )}
          {trade.request_credits > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-accent">
              <Coins className="h-3 w-3" /> {trade.request_credits}c
            </div>
          )}
          {!trade.request_items && !trade.request_credits && (
            <span className="text-[9px] text-muted-foreground italic">Nothing</span>
          )}
        </div>
      </div>

      {/* Message */}
      {trade.message && (
        <div className="flex items-start gap-1.5 text-[9px] text-muted-foreground bg-secondary/30 rounded-sm p-1.5">
          <MessageCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>"{trade.message}"</span>
        </div>
      )}

      {/* Response message */}
      {trade.response_message && (
        <div className="flex items-start gap-1.5 text-[9px] text-foreground bg-secondary/50 rounded-sm p-1.5">
          <MessageCircle className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
          <span>Reply: "{trade.response_message}"</span>
        </div>
      )}

      {/* Meta */}
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

      {/* Actions */}
      {isPending && !isExpired && (
        <div className="pt-1 space-y-1.5">
          {isReceiver && (
            <>
              {showResponse && (
                <Input
                  value={responseMsg}
                  onChange={e => setResponseMsg(e.target.value)}
                  placeholder="Optional reply message..."
                  className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
                />
              )}
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 h-6 text-[9px] uppercase tracking-wider"
                  onClick={() => { showResponse ? respond("accepted") : setShowResponse(true); }}
                  disabled={responding}
                >
                  <Check className="h-3 w-3 mr-1" /> ACCEPT
                </Button>
                <InlineConfirm
                  variant="outline"
                  size="sm"
                  className="flex-1 h-6 text-[9px] uppercase tracking-wider text-destructive border-destructive/20"
                  confirmLabel="REJECT TRADE"
                  warning="The sender will be notified that you rejected their proposal."
                  severity="warning"
                  onConfirm={() => respond("rejected")}
                  disabled={responding}
                >
                  <X className="h-3 w-3 mr-1" /> REJECT
                </InlineConfirm>
              </div>
            </>
          )}
          {isSender && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[9px] uppercase tracking-wider text-muted-foreground"
              onClick={cancel}
              disabled={responding}
            >
              <X className="h-3 w-3 mr-1" /> CANCEL PROPOSAL
            </Button>
          )}
        </div>
      )}
    </div>
  );
}