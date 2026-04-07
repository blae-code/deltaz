import { ArrowRight, CheckCircle, XCircle, Clock, User, Shield } from "lucide-react";
import moment from "moment";

const RESOURCE_LABELS = {
  food: "Food", water: "Water", medical: "Medical", power: "Power",
  defense_parts: "Def Parts", scrap: "Scrap", credits: "Credits",
};

export default function TransactionLog({ transactions, userEmail }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-[10px] text-muted-foreground">No transactions yet. Complete a trade to see the log.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {transactions.map(tx => {
        const isSeller = tx.seller_email === userEmail;
        const isBuyer = tx.buyer_email === userEmail;
        const StatusIcon = tx.status === "completed" ? CheckCircle : XCircle;
        const statusColor = tx.status === "completed" ? "text-status-ok" : "text-destructive";

        return (
          <div key={tx.id} className="border border-border bg-secondary/20 rounded-sm px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <StatusIcon className={`h-3 w-3 ${statusColor}`} />
                <span className="text-[10px] font-mono text-foreground">
                  {tx.seller_type === "npc_faction" ? (
                    <><Shield className="h-3 w-3 inline text-accent mr-1" />{tx.npc_faction_name}</>
                  ) : (
                    tx.seller_base_name
                  )}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-mono text-foreground">{tx.buyer_base_name}</span>
              </div>
              <span className="text-[9px] text-muted-foreground">{moment(tx.created_date).fromNow()}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-primary font-semibold">
                {tx.quantity_sold} {RESOURCE_LABELS[tx.resource_sold]}
              </span>
              <span className="text-muted-foreground">for</span>
              <span className="text-accent font-semibold">
                {tx.quantity_paid} {RESOURCE_LABELS[tx.resource_paid]}
              </span>
              {(isSeller || isBuyer) && (
                <span className="text-[8px] border border-border rounded px-1 py-0.5 text-muted-foreground uppercase">
                  {isSeller ? "sold" : "bought"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}