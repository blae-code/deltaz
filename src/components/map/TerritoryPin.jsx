import { MapPin, Crosshair, Radio, X, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "../terminal/StatusIndicator";

const threatColors = {
  minimal: "text-muted-foreground",
  low: "text-foreground",
  moderate: "text-status-warn",
  high: "text-status-danger",
  critical: "text-status-danger",
};

const statusColors = {
  secured: "online",
  contested: "warning",
  hostile: "critical",
  uncharted: "offline",
};

const severityIcon = {
  info: "text-primary",
  warning: "text-status-warn",
  critical: "text-status-danger",
  emergency: "text-status-danger",
};

export default function TerritoryPin({ territory, factionName, factionColor, jobs, events, isOpen, onToggle }) {
  return (
    <div className="relative">
      {/* Pin button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 border border-border bg-card rounded-sm px-3 py-2 hover:border-primary/50 transition-colors w-full text-left"
      >
        <div
          className="h-6 w-6 rounded-sm flex items-center justify-center shrink-0"
          style={{
            backgroundColor: (factionColor || "hsl(var(--muted))") + "25",
            borderColor: factionColor || "hsl(var(--border))",
            border: "1px solid",
          }}
        >
          <MapPin className="h-3 w-3" style={{ color: factionColor || "hsl(var(--primary))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground truncate">{territory.name}</span>
            <Badge variant="outline" className="text-[9px] shrink-0">{territory.sector}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusIndicator status={statusColors[territory.status] || "offline"} />
            <span className="text-[10px] text-muted-foreground uppercase">{territory.status}</span>
          </div>
        </div>
        {/* Indicators */}
        <div className="flex items-center gap-1.5 shrink-0">
          {jobs.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-accent">
              <Crosshair className="h-3 w-3" />
              {jobs.length}
            </span>
          )}
          {events.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary">
              <Radio className="h-3 w-3" />
              {events.length}
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail panel */}
      {isOpen && (
        <div className="border border-primary/30 bg-card rounded-sm mt-1 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/30">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              INTEL — {territory.name}
            </span>
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Territory stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="border border-border rounded-sm p-2">
                <div className="text-[9px] text-muted-foreground tracking-wider">THREAT</div>
                <div className={`text-xs font-bold uppercase ${threatColors[territory.threat_level] || "text-muted-foreground"}`}>
                  {territory.threat_level}
                </div>
              </div>
              <div className="border border-border rounded-sm p-2">
                <div className="text-[9px] text-muted-foreground tracking-wider">CONTROL</div>
                <div className="text-xs font-bold truncate" style={{ color: factionColor }}>{factionName}</div>
              </div>
              <div className="border border-border rounded-sm p-2">
                <div className="text-[9px] text-muted-foreground tracking-wider">STATUS</div>
                <div className="text-xs font-bold uppercase text-foreground">{territory.status}</div>
              </div>
            </div>

            {/* Resources */}
            {territory.resources?.length > 0 && (
              <div>
                <div className="text-[9px] text-muted-foreground tracking-wider mb-1">RESOURCES</div>
                <div className="flex flex-wrap gap-1">
                  {territory.resources.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[9px]">{r}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Missions in this territory */}
            {jobs.length > 0 && (
              <div>
                <div className="text-[9px] text-muted-foreground tracking-wider mb-1">ACTIVE MISSIONS</div>
                <div className="space-y-1.5">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-2 border border-border rounded-sm px-2 py-1.5">
                      <Crosshair className="h-3 w-3 text-accent shrink-0" />
                      <span className="text-[10px] text-foreground flex-1 truncate">{job.title}</span>
                      <Badge variant="outline" className="text-[9px] uppercase">{job.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events in this territory */}
            {events.length > 0 && (
              <div>
                <div className="text-[9px] text-muted-foreground tracking-wider mb-1">ACTIVE EVENTS</div>
                <div className="space-y-1.5">
                  {events.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2 border border-border rounded-sm px-2 py-1.5">
                      {ev.severity === "critical" || ev.severity === "emergency" ? (
                        <AlertTriangle className={`h-3 w-3 shrink-0 ${severityIcon[ev.severity]}`} />
                      ) : (
                        <Radio className={`h-3 w-3 shrink-0 ${severityIcon[ev.severity] || "text-primary"}`} />
                      )}
                      <span className="text-[10px] text-foreground flex-1 truncate">{ev.title}</span>
                      <span className={`text-[9px] font-semibold uppercase ${severityIcon[ev.severity] || "text-muted-foreground"}`}>
                        {ev.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {jobs.length === 0 && events.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No active missions or events in this sector.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}