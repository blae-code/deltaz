import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap, Cloud, Package, Radio, AlertTriangle, Skull,
  Loader2, RefreshCw, MapPin, Crosshair, ChevronDown, ChevronUp,
} from "lucide-react";
import moment from "moment";

const categoryIcons = {
  environmental_hazard: Cloud,
  supply_drop: Package,
  anomaly: Radio,
  resource_surge: Zap,
  infrastructure_collapse: AlertTriangle,
  hostile_incursion: Skull,
};

const severityStyle = {
  info: "border-border bg-card",
  warning: "border-status-warn/30 bg-status-warn/5",
  critical: "border-status-danger/30 bg-status-danger/5",
  emergency: "border-status-danger/50 bg-status-danger/10",
};

export default function SectorEventWidget({ isAdmin }) {
  const [events, setEvents] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadData = async () => {
    const [ev, bc] = await Promise.all([
      base44.entities.Event.filter({ is_active: true }, "-created_date", 10),
      base44.entities.Broadcast.filter({ auto_generated: true }, "-created_date", 6),
    ]);
    setEvents(ev);
    setBroadcasts(bc);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsubs = [
      base44.entities.Event.subscribe((e) => {
        if (e.type === "create") setEvents(prev => [e.data, ...prev].slice(0, 10));
      }),
      base44.entities.Broadcast.subscribe((e) => {
        if (e.type === "create" && e.data.auto_generated) setBroadcasts(prev => [e.data, ...prev].slice(0, 6));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const triggerEngine = async () => {
    setRunning(true);
    try {
      await base44.functions.invoke("sectorEventEngine", {});
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  // Merge events + broadcasts into a timeline
  const sectorItems = broadcasts.map(bc => ({
    id: bc.id,
    title: bc.title,
    content: bc.content,
    severity: bc.severity === "emergency" ? "emergency" : bc.severity === "critical" ? "critical" : bc.severity === "urgent" ? "warning" : "info",
    sector: bc.sector,
    faction_name: bc.faction_name,
    faction_color: bc.faction_color,
    channel: bc.channel,
    time: bc.created_date,
    type: "broadcast",
  }));

  const shown = expanded ? sectorItems : sectorItems.slice(0, 3);

  if (loading) {
    return (
      <div className="border border-border bg-card rounded-sm p-4 text-center">
        <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-1.5 bg-secondary/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-3 w-3 text-accent" />
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-accent font-display">
            Sector Events
          </h3>
          {sectorItems.length > 0 && (
            <Badge variant="outline" className="text-[7px] h-4">
              {sectorItems.length} ACTIVE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Button
              variant="ghost" size="sm"
              className="h-5 text-[8px] tracking-wider text-muted-foreground hover:text-primary px-1.5"
              onClick={triggerEngine}
              disabled={running}
            >
              {running ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {shown.length === 0 && (
          <div className="p-4 text-center">
            <Radio className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-[9px] text-muted-foreground font-mono">No active sector events. Sectors are stable.</p>
          </div>
        )}
        {shown.map((item) => (
          <SectorEventRow key={item.id} item={item} />
        ))}
      </div>

      {sectorItems.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-border/30 px-3 py-1 text-[8px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          {expanded ? "COLLAPSE" : `+${sectorItems.length - 3} MORE`}
        </button>
      )}
    </div>
  );
}

function SectorEventRow({ item }) {
  const sev = severityStyle[item.severity] || severityStyle.info;

  return (
    <div className={`px-3 py-2 ${sev}`}>
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          {item.severity === "critical" || item.severity === "emergency" ? (
            <AlertTriangle className="h-3 w-3 text-status-danger" />
          ) : (
            <MapPin className="h-3 w-3 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-foreground">{item.title}</span>
            {item.sector && (
              <Badge variant="outline" className="text-[7px] h-3.5 py-0">{item.sector}</Badge>
            )}
            {item.channel && (
              <Badge variant="outline" className="text-[7px] h-3.5 py-0 uppercase">{item.channel}</Badge>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{item.content}</p>
          <div className="flex items-center gap-2 mt-1 text-[8px] text-muted-foreground">
            {item.faction_name && (
              <span style={{ color: item.faction_color }}>{item.faction_name}</span>
            )}
            <span>{moment(item.time).fromNow()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}