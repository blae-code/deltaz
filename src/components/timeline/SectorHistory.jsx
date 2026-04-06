import { useMemo } from "react";
import moment from "moment";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, X, Map } from "lucide-react";

const statusColors = {
  secured: "bg-status-ok/15 text-status-ok border-status-ok/30",
  contested: "bg-status-warn/15 text-status-warn border-status-warn/30",
  hostile: "bg-status-danger/15 text-status-danger border-status-danger/30",
  uncharted: "bg-muted/15 text-muted-foreground border-border",
};

const threatColors = {
  minimal: "text-status-ok",
  low: "text-status-ok",
  moderate: "text-status-warn",
  high: "text-status-danger",
  critical: "text-status-danger",
};

export default function SectorHistory({ sector, logs, factionMap, territories, onClose }) {
  const sectorLogs = useMemo(() => {
    if (!sector) return [];
    return logs
      .filter((l) => l.sector === sector)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [sector, logs]);

  const territory = useMemo(() => {
    if (!sector) return null;
    return territories.find((t) => t.sector === sector);
  }, [sector, territories]);

  if (!sector) {
    return (
      <DataCard title="Sector Detail">
        <div className="text-center py-10">
          <Map className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">
            Click a sector code in the feed to inspect its history
          </p>
        </div>
      </DataCard>
    );
  }

  const currentFaction = territory?.controlling_faction_id
    ? factionMap[territory.controlling_faction_id]
    : null;

  return (
    <DataCard
      title={`Sector ${sector}`}
      headerRight={
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      }
    >
      {/* Current state */}
      {territory && (
        <div className="border border-border rounded-sm p-3 mb-4 bg-secondary/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-foreground font-semibold">{territory.name}</span>
            <Badge variant="outline" className={`text-[7px] h-4 ${statusColors[territory.status] || statusColors.uncharted}`}>
              {(territory.status || "UNKNOWN").toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <div className="flex items-center gap-1">
              {currentFaction ? (
                <>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentFaction.color || "#888" }} />
                  <span>{currentFaction.tag || currentFaction.name}</span>
                </>
              ) : (
                <span>Unclaimed</span>
              )}
            </div>
            <span className={threatColors[territory.threat_level] || "text-muted-foreground"}>
              THREAT: {(territory.threat_level || "?").toUpperCase()}
            </span>
          </div>
          {territory.resources?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {territory.resources.map((r) => (
                <Badge key={r} className="text-[7px] h-4 bg-primary/10 text-primary border-primary/20">{r}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="text-[9px] font-mono text-muted-foreground tracking-widest mb-2 uppercase">
        Change History ({sectorLogs.length})
      </div>

      {sectorLogs.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">No changes recorded for this sector.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-0">
          {sectorLogs.map((log, i) => {
            const eventLabel = {
              status_change: "STATUS",
              control_change: "CONTROL",
              threat_change: "THREAT",
            };
            const eventColor = {
              status_change: "bg-primary/20 text-primary",
              control_change: "bg-accent/20 text-accent",
              threat_change: "bg-status-danger/20 text-status-danger",
            };

            return (
              <div key={log.id} className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0">
                {/* Vertical timeline line */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary/40 mt-1" />
                  {i < sectorLogs.length - 1 && <div className="w-px h-full bg-border/50 min-h-[24px]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[7px] px-1 py-0.5 rounded font-semibold ${eventColor[log.event_type] || ""}`}>
                      {eventLabel[log.event_type] || log.event_type}
                    </span>
                    <span className="text-[8px] text-muted-foreground">
                      {moment(log.created_date).format("MMM D, HH:mm")}
                    </span>
                  </div>
                  <div className="text-[9px] text-foreground/80 mt-0.5">
                    {log.description || `${(log.old_value || "?").toUpperCase()} → ${(log.new_value || "?").toUpperCase()}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DataCard>
  );
}