import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import moment from "moment";

export default function ReputationHistory({ logs, factions }) {
  const getFactionName = (id) => factions.find((f) => f.id === id)?.name || "Unknown";
  const getFactionColor = (id) => factions.find((f) => f.id === id)?.color;

  if (logs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No reputation activity recorded.</p>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const isPositive = log.delta > 0;
        const isNeutral = log.delta === 0;

        return (
          <div key={log.id} className="flex items-start gap-3 border border-border rounded-sm p-3">
            {/* Delta indicator */}
            <div className={`mt-0.5 flex items-center justify-center h-6 w-6 rounded-sm shrink-0 ${
              isPositive ? "bg-primary/15 text-primary" : isNeutral ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive"
            }`}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : isNeutral ? <Minus className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">{log.reason}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  <span style={{ color: getFactionColor(log.faction_id) }}>{getFactionName(log.faction_id)}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {moment(log.created_date).fromNow()}
                </span>
              </div>
            </div>

            {/* Score change */}
            <span className={`text-xs font-mono font-semibold shrink-0 ${
              isPositive ? "text-primary" : isNeutral ? "text-muted-foreground" : "text-destructive"
            }`}>
              {isPositive ? "+" : ""}{log.delta}
            </span>
          </div>
        );
      })}
    </div>
  );
}