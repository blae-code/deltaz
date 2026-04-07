import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import moment from "moment";

const typeStyles = {
  combat_kill: "bg-accent/15 text-accent border-accent/30",
  combat_death: "bg-destructive/15 text-destructive border-destructive/30",
  mission_completed: "bg-status-ok/15 text-status-ok border-status-ok/30",
  mission_failed: "bg-destructive/15 text-destructive border-destructive/30",
  mission_accepted: "bg-primary/15 text-primary border-primary/30",
  trade_completed: "bg-status-info/15 text-status-info border-status-info/30",
  territory_capture: "bg-primary/15 text-primary border-primary/30",
  territory_lost: "bg-destructive/15 text-destructive border-destructive/30",
  diplomacy_change: "bg-accent/15 text-accent border-accent/30",
};

export default function PlayerActivityLog({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="border border-border rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-mono text-muted-foreground tracking-widest uppercase">ACTIVITY LOG</h3>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">No recent activity recorded.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
          RECENT SERVER ACTIVITY ({logs.length})
        </h3>
      </div>
      <div className="max-h-[300px] overflow-y-auto space-y-1.5">
        {logs.map((log, i) => (
          <div key={log.id || i} className="flex items-start gap-2.5 py-1.5 border-b border-border/30 last:border-0">
            <div className="shrink-0 mt-0.5">
              <div className={`h-1.5 w-1.5 rounded-full ${
                log.severity === "critical" || log.severity === "emergency" ? "bg-destructive" :
                log.severity === "notable" ? "bg-accent" : "bg-muted-foreground/50"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-foreground font-semibold truncate">{log.title}</span>
                <Badge variant="outline" className={`text-[8px] uppercase ${typeStyles[log.event_type] || "text-muted-foreground"}`}>
                  {(log.event_type || "").replace(/_/g, " ")}
                </Badge>
              </div>
              {log.detail && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{log.detail}</p>
              )}
              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground/60">
                {log.player_callsign && <span>{log.player_callsign}</span>}
                {log.sector && <span>Sector {log.sector}</span>}
                <span>{moment(log.created_date).fromNow()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}