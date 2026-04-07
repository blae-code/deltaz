import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Percent } from "lucide-react";

const URGENCY_STYLES = {
  low: "border-border bg-secondary/20",
  medium: "border-accent/20 bg-accent/5",
  high: "border-status-warn/20 bg-status-warn/5",
  critical: "border-destructive/20 bg-destructive/5",
};

const FILL_COLORS = {
  low: "text-destructive",
  medium: "text-accent",
  high: "text-status-ok",
};

export default function ProactiveTradeCard({ trade }) {
  const isSell = trade.offer_type === "sell";
  const style = URGENCY_STYLES[trade.urgency] || URGENCY_STYLES.medium;

  return (
    <div className={`border rounded-sm px-3 py-2.5 ${style}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {isSell ? (
            <TrendingUp className="h-3 w-3 text-status-ok" />
          ) : (
            <TrendingDown className="h-3 w-3 text-primary" />
          )}
          <Badge variant="outline" className={`text-[8px] uppercase ${isSell ? 'text-status-ok' : 'text-primary'}`}>
            {trade.offer_type}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {trade.urgency && (
            <Badge variant="outline" className="text-[7px] uppercase">{trade.urgency}</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-mono font-bold uppercase text-foreground">
          {trade.resource_offered || '—'}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-mono font-bold uppercase text-foreground">
          {trade.resource_requested || '—'}
        </span>
        {trade.quantity > 0 && (
          <span className="text-[9px] text-muted-foreground font-mono">×{trade.quantity}</span>
        )}
      </div>

      {trade.exchange_ratio && (
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1.5">
          <Percent className="h-2.5 w-2.5" />
          <span className="font-mono">Ratio: {trade.exchange_ratio}</span>
          {trade.predicted_fill_chance && (
            <span className={`ml-2 ${FILL_COLORS[trade.predicted_fill_chance] || ''}`}>
              Fill chance: {trade.predicted_fill_chance}
            </span>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground leading-snug">{trade.reasoning}</p>
    </div>
  );
}