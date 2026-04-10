import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import TerminalLoader from "../terminal/TerminalLoader";
import EmptyState from "../terminal/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Package, ScrollText, X } from "lucide-react";
import moment from "moment";
import { formatTradeLineItems } from "@/lib/gameCatalog";

const statusIcon = {
  completed: <Check className="h-3 w-3 text-status-ok" />,
  rejected: <X className="h-3 w-3 text-destructive" />,
  cancelled: <X className="h-3 w-3 text-muted-foreground" />,
  expired: <X className="h-3 w-3 text-muted-foreground" />,
};

const statusLabel = {
  completed: "COMPLETED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
  expired: "EXPIRED",
};

function formatLineSummary(items = [], credits = 0) {
  const parts = [];
  const itemText = formatTradeLineItems(items);
  if (itemText) {
    parts.push(itemText);
  }
  if (credits > 0) {
    parts.push(`${credits}c`);
  }
  return parts.join(" + ");
}

export default function TradeLedger({ userEmail }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      const [initiated, counterparty] = await Promise.all([
        base44.entities.PlayerTradeLedgerEntry.filter({ initiator_email: userEmail }, "-recorded_at", 100),
        base44.entities.PlayerTradeLedgerEntry.filter({ counterparty_email: userEmail }, "-recorded_at", 100),
      ]);

      const seen = new Set();
      const merged = [...initiated, ...counterparty]
        .filter((entry) => {
          if (seen.has(entry.id)) return false;
          seen.add(entry.id);
          return true;
        })
        .sort((left, right) => new Date(right.recorded_at || right.created_date) - new Date(left.recorded_at || left.created_date));

      setRecords(merged);
      setLoading(false);
    };

    load();
  }, [userEmail]);

  if (loading) {
    return <TerminalLoader size="sm" messages={["LOADING LEDGER...", "COMPILING TRADE HISTORY...", "VERIFYING IMMUTABLE RECORDS..."]} />;
  }

  const completed = records.filter((record) => record.outcome_status === "completed").length;
  const totalVolume = records
    .filter((record) => record.outcome_status === "completed")
    .reduce((sum, record) => sum + Number(record.initiator_credits || 0) + Number(record.counterparty_credits || 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="panel-frame p-2 text-center">
          <p className="text-lg font-bold font-display text-primary">{records.length}</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Ledger Rows</p>
        </div>
        <div className="panel-frame p-2 text-center">
          <p className="text-lg font-bold font-display text-status-ok">{completed}</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Completed</p>
        </div>
        <div className="panel-frame p-2 text-center">
          <p className="text-lg font-bold font-display text-accent">{totalVolume}c</p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Credit Volume</p>
        </div>
      </div>

      <DataCard title={`Trade Ledger (${records.length})`}>
        {records.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Ledger Empty"
            why="No immutable player-trade rows exist for your account yet."
            action="Complete, reject, cancel, or expire a player trade to record it permanently here."
          />
        ) : (
          <div className="space-y-1.5">
            {records.map((record) => {
              const isInitiator = record.initiator_email === userEmail;
              const otherParty = isInitiator
                ? (record.counterparty_callsign || record.counterparty_email || "Trade Board")
                : (record.initiator_callsign || record.initiator_email || "Trade Board");
              const sentItems = isInitiator ? record.initiator_items : record.counterparty_items;
              const receivedItems = isInitiator ? record.counterparty_items : record.initiator_items;
              const sentCredits = isInitiator ? (record.initiator_credits || 0) : (record.counterparty_credits || 0);
              const receivedCredits = isInitiator ? (record.counterparty_credits || 0) : (record.initiator_credits || 0);

              return (
                <div key={record.id} className="panel-frame flex items-center gap-2 p-2 text-[10px]">
                  {statusIcon[record.outcome_status] || <X className="h-3 w-3 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-primary">{isInitiator ? "You" : otherParty}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-foreground">{isInitiator ? otherParty : "You"}</span>
                    </div>
                    <div className="mt-0.5 text-[9px] text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Package className="h-2.5 w-2.5" />
                        <span>Sent: {formatLineSummary(sentItems, sentCredits) || "Nothing"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-2.5 w-2.5" />
                        <span>Received: {formatLineSummary(receivedItems, receivedCredits) || "Nothing"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="flex justify-end gap-1">
                      <Badge variant="outline" className="text-[7px] uppercase">
                        {statusLabel[record.outcome_status] || record.outcome_status}
                      </Badge>
                      {record.settlement_mode === "synthetic_backfill" && (
                        <Badge variant="outline" className="text-[7px] uppercase text-muted-foreground">
                          BACKFILL
                        </Badge>
                      )}
                    </div>
                    <p className="text-[8px] text-muted-foreground">
                      {moment(record.recorded_at || record.created_date).fromNow()}
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
