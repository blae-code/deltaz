import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, AlertTriangle } from "lucide-react";

const severityStyle = {
  info: "border-primary/30 bg-primary/5",
  warning: "border-accent/30 bg-accent/5",
  critical: "border-destructive/30 bg-destructive/5",
  emergency: "border-destructive/50 bg-destructive/10",
};

const severityBadge = {
  info: "bg-primary/20 text-primary",
  warning: "bg-accent/20 text-accent",
  critical: "bg-destructive/20 text-destructive",
  emergency: "bg-destructive/30 text-destructive",
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Event.list("-created_date", 50)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">INTERCEPTING TRANSMISSIONS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Communications Feed
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Intercepted broadcasts and alerts</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "world_event", "faction_conflict", "anomaly", "broadcast", "system_alert"].map((f) => {
          const labelMap = { faction_conflict: "clan conflict" };
          return (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setFilter(f)}
          >
            {(labelMap[f] || f).replace("_", " ")}
          </Button>
        );
        })}
      </div>

      {filtered.length === 0 ? (
        <DataCard title="No Transmissions">
          <p className="text-xs text-muted-foreground">Channels are silent.</p>
        </DataCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <div key={event.id} className={`border rounded-sm p-4 ${severityStyle[event.severity] || severityStyle.info}`}>
              <div className="flex items-start gap-3">
                {event.severity === "emergency" || event.severity === "critical" ? (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <Radio className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{event.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider ${severityBadge[event.severity] || severityBadge.info}`}>
                      {event.severity}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {event.type?.replace("_", " ")}
                    </Badge>
                  </div>
                  {event.content && (
                    <p className="text-xs text-muted-foreground mt-1">{event.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}