import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Terminal, MapPin, Crosshair, Shield, Coins, Radio,
  ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import moment from "moment";

const EVENT_TYPES = [
  { key: "all", label: "ALL" },
  { key: "faction_conflict", label: "TERRITORIAL" },
  { key: "world_event", label: "WORLD" },
  { key: "system_alert", label: "SYSTEM" },
  { key: "broadcast", label: "COMMS" },
  { key: "anomaly", label: "ANOMALY" },
];

const typeConfig = {
  faction_conflict: { icon: Shield, color: "text-chart-5", prefix: "[CLAN WAR]" },
  world_event: { icon: AlertTriangle, color: "text-accent", prefix: "[WORLD]" },
  system_alert: { icon: Coins, color: "text-primary", prefix: "[SYSTEM]" },
  broadcast: { icon: Radio, color: "text-chart-4", prefix: "[COMMS]" },
  anomaly: { icon: AlertTriangle, color: "text-destructive", prefix: "[ANOMALY]" },
};

const severityColors = {
  info: "text-muted-foreground",
  warning: "text-accent",
  critical: "text-destructive",
  emergency: "text-destructive font-bold",
};

function LogEntry({ event, index }) {
  const config = typeConfig[event.type] || typeConfig.broadcast;
  const Icon = config.icon;
  const ts = moment(event.created_date).format("HH:mm:ss");
  const date = moment(event.created_date).format("YYYY.MM.DD");

  return (
    <div className="flex items-start gap-2 px-3 py-1.5 hover:bg-secondary/30 transition-colors group font-mono">
      <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5 w-16">{ts}</span>
      <Icon className={`h-3 w-3 shrink-0 mt-0.5 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <span className={`text-[10px] font-semibold tracking-wider ${config.color}`}>
          {config.prefix}
        </span>{" "}
        <span className={`text-[11px] ${severityColors[event.severity] || "text-foreground"}`}>
          {event.title}
        </span>
        {event.content && (
          <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 hidden group-hover:block">
            {event.content}
          </p>
        )}
      </div>
      <Badge variant="outline" className="text-[8px] shrink-0 opacity-50 group-hover:opacity-100">
        {event.severity}
      </Badge>
    </div>
  );
}

export default function CombatLog() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    base44.entities.Event.list("-created_date", 50)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  // Real-time new events
  useEffect(() => {
    const unsub = base44.entities.Event.subscribe((ev) => {
      if (ev.type === "create") {
        setEvents((prev) => [ev.data, ...prev].slice(0, 100));
      }
    });
    return unsub;
  }, []);

  const filtered = events.filter((e) => {
    const matchesType = typeFilter === "all" || e.type === typeFilter;
    const matchesSearch = !search || 
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.content?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
            COMBAT LOG
          </h3>
          <span className="text-[9px] text-muted-foreground">
            {filtered.length} ENTR{filtered.length !== 1 ? "IES" : "Y"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <span className="text-[9px] text-muted-foreground tracking-wider">
              LAST: {moment(events[0]?.created_date).fromNow()}
            </span>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <>
          {/* Search + Filters */}
          <div className="border-b border-border/50 px-3 py-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search combat log..."
                className="h-7 text-[10px] pl-7 bg-secondary/30 border-border font-mono"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {EVENT_TYPES.map((t) => (
                <Button
                  key={t.key}
                  variant={typeFilter === t.key ? "default" : "ghost"}
                  size="sm"
                  className="h-5 text-[9px] px-2 tracking-wider"
                  onClick={() => setTypeFilter(t.key)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Log entries */}
          <div ref={scrollRef} className="max-h-72 overflow-y-auto divide-y divide-border/30">
            {loading ? (
              <div className="px-3 py-6 text-center">
                <Terminal className="h-4 w-4 text-primary mx-auto mb-2 animate-pulse" />
                <p className="text-[10px] text-muted-foreground tracking-wider font-mono">LOADING LOG HISTORY...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-[10px] text-muted-foreground tracking-wider font-mono">
                  {search ? "NO MATCHING ENTRIES" : "LOG EMPTY — AWAITING DATA"}
                </p>
              </div>
            ) : (
              filtered.map((event, idx) => (
                <LogEntry key={event.id} event={event} index={idx} />
              ))
            )}
          </div>

          {/* Terminal prompt */}
          <div className="border-t border-border/50 px-3 py-1.5 bg-secondary/20">
            <span className="text-[9px] text-primary font-mono">
              root@deadSignal:~$ <span className="text-muted-foreground animate-pulse">_</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}