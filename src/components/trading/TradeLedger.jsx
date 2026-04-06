import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import EmptyState from "../terminal/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Coins, Package, Check, X, ScrollText } from "lucide-react";
import moment from "moment";

const statusIcon = {
  accepted: <Check className="h-3 w-3 text-status-ok" />,
  rejected: <X className="h-3 w-3 text-destructive" />,
  cancelled: <X className="h-3 w-3 text-muted-foreground" />,
};

const statusLabel = {
  accepted: "COMPLETED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
  expired: "EXPIRED",
};

export default function TradeLedger({ userEmail }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [sent, received] = await Promise.all([
        base44.entities.TradeRequest.filter({ sender_email: userEmail }, "-created_date", 100),
        base44.entities.TradeRequest.filter({ receiver_email: userEmail }, "-created_date", 100),
      ]);
      const all = [...sent, ...received]
        .filter(r => r.status !== "pending")
        .sort((a, b) => new Date(b.resolved_at || b.created_date) - new Date(a.resolved_at || a.created_date));
      // Deduplicate
      const seen = new Set();
      const unique = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      setRecords(unique);
      setLoading(false);
    };
    load();
  }, [userEmail]);

  const completed = records.filter(r => r.status === "accepted").length;
  const totalVolume = records.filter(r => r.status === "accepted")
    .reduce((s, r) => s + (r.offer_credits || 0) + (r.request_credits || 0), 0);

  if (loading) {
    return <p className="text-[10px] text-muted-foreground animate-pulse">Loading trade ledger...</p>;
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-border rounded-sm p-2 bg-card text-center">
          <p className="text-lg font-bold font-display text-primary">{records.length}</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Total Trades</p>
        </div>
        <div className="border border-border rounded-sm p-2 bg-card text-center">
          <p className="text-lg font-bold font-display text-status-ok">{completed}</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Completed</p>
        </div>
        <div className="border border-border rounded-sm p-2 bg-card text-center">
          <p className="text-lg font-bold font-display text-accent">{totalVolume}c</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Credit Volume</p>
        </div>
      </div>

      {/* Ledger */}
      <DataCard title={`Trade Ledger (${records.length})`}>
        {records.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Ledger Empty"
            why="You have no resolved trades. Every completed, rejected, or expired deal will be permanently recorded here."
            action="Head to the Trade Post or P2P Deals tab to initiate your first transaction."
          />
        ) : (
          <div className="space-y-1.5">
            {records.map(r => {
              const isSender = r.sender_email === userEmail;
              return (
                <div key={r.id} className="flex items-center gap-2 border border-border rounded-sm p-2 bg-secondary/20 text-[10px]">
                  {statusIcon[r.status] || <X className="h-3 w-3 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 font-mono">
                      <span className={isSender ? "text-primary" : "text-foreground"}>
                        {isSender ? "You" : r.sender_callsign}
                      </span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className={!isSender ? "text-primary" : "text-foreground"}>
                        {!isSender ? "You" : r.receiver_callsign}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                      {(r.offer_items || r.offer_credits > 0) && (
                        <span className="flex items-center gap-0.5">
                          <Package className="h-2.5 w-2.5" />
                          {r.offer_items || ""}{r.offer_credits > 0 ? ` ${r.offer_credits}c` : ""}
                        </span>
                      )}
                      {(r.request_items || r.request_credits > 0) && (
                        <span className="flex items-center gap-0.5">
                          ↔ <Package className="h-2.5 w-2.5" />
                          {r.request_items || ""}{r.request_credits > 0 ? ` ${r.request_credits}c` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[7px] uppercase">
                      {statusLabel[r.status] || r.status}
                    </Badge>
                    <p className="text-[8px] text-muted-foreground mt-0.5">
                      {moment(r.resolved_at || r.created_date).fromNow()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DataCard>
    </div>
  );
}