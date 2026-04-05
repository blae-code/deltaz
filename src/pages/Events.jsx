import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Zap, Swords, Search as SearchIcon, Globe, AlertTriangle, Megaphone, Settings } from "lucide-react";
import moment from "moment";

const SEVERITY_STYLES = {
  info: "border-l-primary",
  warning: "border-l-threat-yellow",
  alert: "border-l-threat-orange",
  critical: "border-l-destructive",
};

const TYPE_ICONS = {
  combat: Swords,
  discovery: SearchIcon,
  faction_war: Zap,
  trade: Globe,
  anomaly: AlertTriangle,
  broadcast: Megaphone,
  system: Settings,
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.GameEvent.list("-created_date", 50).then(data => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-primary animate-pulse-glow text-sm">SCANNING FREQUENCIES...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-mono font-bold text-primary terminal-glow tracking-widest">SIGNAL INTERCEPTS</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">{events.length} SIGNALS LOGGED</p>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Radio className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-mono text-xs text-muted-foreground">NO SIGNALS INTERCEPTED</p>
            </CardContent>
          </Card>
        ) : (
          events.map(evt => {
            const Icon = TYPE_ICONS[evt.event_type] || Radio;
            return (
              <Card key={evt.id} className={`bg-card border-l-4 ${SEVERITY_STYLES[evt.severity] || SEVERITY_STYLES.info} border-t border-r border-b border-border`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-sm bg-muted flex-shrink-0">
                      <Icon className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-semibold text-foreground">{evt.title}</span>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {evt.event_type?.replace("_", " ")}
                        </Badge>
                        {evt.severity === "critical" && (
                          <Badge variant="destructive" className="font-mono text-[10px] animate-pulse">
                            CRITICAL
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mb-2">{evt.description}</p>
                      <div className="flex flex-wrap gap-3 text-[10px] font-mono text-muted-foreground">
                        {evt.territory && <span>ZONE: {evt.territory}</span>}
                        {evt.faction && <span>FACTION: {evt.faction}</span>}
                        <span>{moment(evt.created_date).fromNow()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}