import { ArrowRight, User, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import moment from "moment";

const RESOURCE_COLORS = {
  food: "text-green-400",
  water: "text-blue-400",
  medical: "text-pink-400",
  power: "text-yellow-400",
  defense_parts: "text-orange-400",
  scrap: "text-gray-400",
  credits: "text-accent",
};

const RESOURCE_LABELS = {
  food: "Food",
  water: "Water",
  medical: "Medical",
  power: "Power",
  defense_parts: "Defense Parts",
  scrap: "Scrap",
  credits: "Credits",
};

const STATUS_STYLES = {
  open: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-status-ok/10 text-status-ok border-status-ok/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  expired: "bg-muted text-muted-foreground border-border",
};

export default function TradeListingCard({ trade, userEmail, userBases, onAccept, accepting }) {
  const isOwn = trade.seller_email === userEmail;
  const isNpc = trade.seller_type === "npc_faction";
  const isOpen = trade.status === "open";
  const isExpired = trade.expires_at && new Date(trade.expires_at) < new Date();

  return (
    <div className="border border-border bg-card rounded-sm p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isNpc ? (
            <Shield className="h-3.5 w-3.5 text-accent shrink-0" />
          ) : (
            <User className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          <span className="text-[11px] font-mono text-foreground truncate">
            {isNpc ? trade.npc_faction_name : trade.seller_base_name || "Unknown Base"}
          </span>
          {isOwn && (
            <Badge variant="outline" className="text-[8px] uppercase">YOU</Badge>
          )}
        </div>
        <Badge variant="outline" className={`text-[8px] uppercase ${STATUS_STYLES[isExpired && isOpen ? "expired" : trade.status]}`}>
          {isExpired && isOpen ? "EXPIRED" : trade.status}
        </Badge>
      </div>

      {/* Trade offer */}
      <div className="flex items-center gap-2 bg-secondary/40 rounded-sm px-3 py-2">
        <div className="text-center flex-1">
          <div className={`text-sm font-bold font-display ${RESOURCE_COLORS[trade.resource_offered]}`}>
            {trade.quantity_offered}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {RESOURCE_LABELS[trade.resource_offered]}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="text-center flex-1">
          <div className={`text-sm font-bold font-display ${RESOURCE_COLORS[trade.resource_requested]}`}>
            {trade.quantity_requested}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {RESOURCE_LABELS[trade.resource_requested]}
          </div>
        </div>
      </div>

      {/* Notes */}
      {trade.notes && (
        <p className="text-[10px] text-muted-foreground italic leading-relaxed">{trade.notes}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {moment(trade.created_date).fromNow()}
        </div>

        {isOpen && !isOwn && !isExpired && userBases.length > 0 && (
          <Button
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            disabled={accepting}
            onClick={() => onAccept(trade.id, userBases[0].id)}
          >
            {accepting ? "Processing..." : "Accept Trade"}
          </Button>
        )}
      </div>
    </div>
  );
}