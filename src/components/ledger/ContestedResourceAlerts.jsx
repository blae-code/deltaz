import { AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

const threatColors = {
  minimal: "text-status-ok",
  low: "text-status-ok",
  moderate: "text-status-warn",
  high: "text-status-danger",
  critical: "text-status-danger",
};

export default function ContestedResourceAlerts({ alerts, factionMap }) {
  return (
    <div className="border border-status-danger/30 bg-status-danger/5 rounded-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-status-danger/20 bg-status-danger/10">
        <AlertTriangle className="h-3.5 w-3.5 text-status-danger" />
        <span className="text-[10px] font-mono font-semibold text-status-danger tracking-widest uppercase">
          Contested Resource Sectors — {alerts.length} Active
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-border/30">
        {alerts.map((t) => {
          const faction = t.controlling_faction_id ? factionMap[t.controlling_faction_id] : null;
          const tc = threatColors[t.threat_level] || "text-muted-foreground";
          return (
            <div key={t.id} className="flex items-center justify-between px-4 py-2 hover:bg-status-danger/5 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-primary font-bold">{t.sector}</span>
                    <span className="text-[10px] font-mono text-foreground">{t.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[8px] h-4 ${t.status === "hostile" ? "border-status-danger/40 text-status-danger" : "border-status-warn/40 text-status-warn"}`}
                    >
                      {t.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {faction && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: faction.color || "#888" }} />
                        <span className="text-[8px] text-muted-foreground">{faction.name}</span>
                      </div>
                    )}
                    <span className={`text-[8px] ${tc}`}>Threat: {(t.threat_level || "unknown").toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {(t.resources || []).map((r) => (
                  <Badge key={r} className="text-[7px] h-4 bg-accent/15 text-accent border-accent/30">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}