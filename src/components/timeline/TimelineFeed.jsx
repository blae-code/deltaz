import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, AlertTriangle, ArrowLeftRight } from "lucide-react";
import DataCard from "../terminal/DataCard";

const eventIcons = {
  status_change: ArrowLeftRight,
  control_change: Shield,
  threat_change: AlertTriangle,
};

const eventColors = {
  status_change: "text-primary border-primary/30",
  control_change: "text-accent border-accent/30",
  threat_change: "text-status-danger border-status-danger/30",
};

const statusStyle = {
  secured: "text-status-ok",
  contested: "text-status-warn",
  hostile: "text-status-danger",
  uncharted: "text-muted-foreground",
};

const threatStyle = {
  minimal: "text-status-ok",
  low: "text-status-ok",
  moderate: "text-status-warn",
  high: "text-status-danger",
  critical: "text-status-danger",
};

export default function TimelineFeed({ logs, factionMap, onSectorClick }) {
  if (logs.length === 0) {
    return (
      <DataCard title="Conflict Feed">
        <p className="text-xs text-muted-foreground text-center py-8">
          No territory changes recorded yet. Changes will appear here automatically.
        </p>
      </DataCard>
    );
  }

  // Group by date
  const grouped = {};
  logs.forEach((l) => {
    const day = moment(l.created_date).format("YYYY-MM-DD");
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(l);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <DataCard title={`Conflict Feed — ${logs.length} events`}>
      <div className="max-h-[600px] overflow-y-auto space-y-4 pr-1">
        {sortedDays.map((day) => (
          <div key={day}>
            {/* Day header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-2 py-1 mb-2">
              <span className="text-[9px] font-mono text-muted-foreground tracking-widest">
                {moment(day).format("ddd, MMM D YYYY")}
              </span>
              <Badge variant="outline" className="ml-2 text-[7px] h-4">
                {grouped[day].length}
              </Badge>
            </div>

            {/* Events for this day */}
            <div className="space-y-1">
              {grouped[day].map((log) => (
                <TimelineEntry
                  key={log.id}
                  log={log}
                  factionMap={factionMap}
                  onSectorClick={onSectorClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}

function TimelineEntry({ log, factionMap, onSectorClick }) {
  const Icon = eventIcons[log.event_type] || ArrowLeftRight;
  const colorClass = eventColors[log.event_type] || "text-muted-foreground border-border";

  const getFactionTag = (id) => {
    if (!id || id === "unclaimed") return "UNCLAIMED";
    const f = factionMap[id];
    return f ? (f.tag || f.name) : "???";
  };

  const getFactionColor = (id) => {
    if (!id || id === "unclaimed") return "#555";
    return factionMap[id]?.color || "#888";
  };

  const renderChange = () => {
    if (log.event_type === "status_change") {
      const oldC = statusStyle[log.old_value] || "text-muted-foreground";
      const newC = statusStyle[log.new_value] || "text-muted-foreground";
      return (
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className={oldC}>{(log.old_value || "?").toUpperCase()}</span>
          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
          <span className={`${newC} font-semibold`}>{(log.new_value || "?").toUpperCase()}</span>
        </div>
      );
    }

    if (log.event_type === "control_change") {
      return (
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: getFactionColor(log.old_faction_id) }} />
            {getFactionTag(log.old_faction_id)}
          </span>
          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="flex items-center gap-1 font-semibold">
            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: getFactionColor(log.new_faction_id) }} />
            {getFactionTag(log.new_faction_id)}
          </span>
        </div>
      );
    }

    if (log.event_type === "threat_change") {
      const oldC = threatStyle[log.old_value] || "text-muted-foreground";
      const newC = threatStyle[log.new_value] || "text-muted-foreground";
      return (
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className={oldC}>{(log.old_value || "?").toUpperCase()}</span>
          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
          <span className={`${newC} font-semibold`}>{(log.new_value || "?").toUpperCase()}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded-sm hover:bg-secondary/30 transition-colors group">
      {/* Timeline dot + icon */}
      <div className={`shrink-0 mt-0.5 h-6 w-6 rounded-sm border flex items-center justify-center ${colorClass}`}>
        <Icon className="h-3 w-3" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onSectorClick(log.sector)}
            className="text-[10px] font-mono font-bold text-primary hover:underline"
          >
            {log.sector}
          </button>
          {log.territory_name && (
            <span className="text-[9px] text-muted-foreground truncate">{log.territory_name}</span>
          )}
          <span className="text-[8px] text-muted-foreground ml-auto whitespace-nowrap">
            {moment(log.created_date).format("HH:mm")}
          </span>
        </div>
        {renderChange()}
      </div>
    </div>
  );
}