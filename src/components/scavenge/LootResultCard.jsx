import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, Coins } from "lucide-react";

const rarityStyle = {
  common: "text-muted-foreground bg-secondary",
  uncommon: "text-primary bg-primary/10 border-primary/20",
  rare: "text-accent bg-accent/10 border-accent/20",
  legendary: "text-chart-5 bg-chart-5/10 border-chart-5/20",
};

export default function LootResultCard({ run, compact }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-border/50 rounded-sm bg-secondary/20 hover:bg-secondary/30 transition-colors">
        <Package className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-foreground truncate block">
            {run.controlling_faction || "Unclaimed"} territory
          </span>
          <span className="text-[9px] text-muted-foreground">
            {run.threat_level} · {run.total_value || 0}cr
          </span>
        </div>
        <Badge variant="outline" className={`text-[8px] ${run.status === "completed" ? "text-status-ok" : run.status === "in_progress" ? "text-status-warn" : "text-status-danger"}`}>
          {run.status}
        </Badge>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="px-3 py-2 bg-secondary/30 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">{run.controlling_faction || "Unclaimed"}</span>
          <Badge variant="outline" className="text-[8px] uppercase">{run.threat_level}</Badge>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-accent font-mono">
          <Coins className="h-3 w-3" />
          {run.total_value || 0}cr
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Loot Summary */}
        {run.loot_summary && (
          <p className="text-[10px] text-muted-foreground italic">{run.loot_summary}</p>
        )}

        {/* Risk Event */}
        {run.risk_event && (
          <div className="flex items-start gap-1.5 text-[9px] text-status-warn bg-status-warn/5 border border-status-warn/20 rounded-sm p-2">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span>{run.risk_event}</span>
          </div>
        )}

        {/* Loot Items */}
        {(run.loot_items || []).length > 0 && (
          <div className="space-y-1">
            {run.loot_items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 bg-secondary/20 rounded-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[7px] px-1 ${rarityStyle[item.rarity] || ""}`}>
                    {item.rarity}
                  </Badge>
                  <span className="text-foreground">{item.name}</span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </div>
                <span className="text-accent font-mono">{item.value}cr</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-[9px] text-muted-foreground text-right">
          {new Date(run.created_date).toLocaleString()}
        </div>
      </div>
    </div>
  );
}