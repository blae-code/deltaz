import { useMemo, useState } from "react";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "@/hooks/useCurrentUser";
import useEntityQuery from "@/hooks/useEntityQuery";
import useWorldClock from "@/hooks/useWorldClock";
import useWorldState from "@/hooks/useWorldState";
import { isAdminOrGM } from "@/lib/displayName";
import { getAuthorityTone } from "@/lib/world-state";
import DataCard from "../terminal/DataCard";
import TelemetrySignalSvg from "../svg/TelemetrySignalSvg";
import WeatherStatusSvg from "../svg/WeatherStatusSvg";
import SeasonGlyphSvg from "../svg/SeasonGlyphSvg";
import WorldClockSvg from "../svg/WorldClockSvg";
import { Radio, Crosshair, Terminal, AlertTriangle } from "lucide-react";

const CHANNEL_CONFIG = {
  comms: { icon: Radio, label: "COMMS", color: "text-primary" },
  ops: { icon: Crosshair, label: "OPS", color: "text-accent" },
  system: { icon: Terminal, label: "SYSTEM", color: "text-muted-foreground" },
};

const SEVERITY_CLASS = {
  routine: "text-muted-foreground",
  notable: "text-primary",
  critical: "text-destructive",
  emergency: "text-destructive",
  info: "text-muted-foreground",
  warning: "text-status-warn",
  error: "text-destructive",
};

function telemetryToneClass(tone) {
  if (tone === "ok") return "text-status-ok";
  if (tone === "warn") return "text-status-warn";
  if (tone === "error") return "text-destructive";
  return "text-muted-foreground";
}

function normalizeEvent(event) {
  return {
    id: `event-${event.id}`,
    channel: "comms",
    title: event.title || "Untitled signal",
    detail: event.content || "",
    severity: event.severity || "info",
    created_date: event.created_date,
    meta: event.type ? event.type.replace(/_/g, " ").toUpperCase() : "EVENT",
  };
}

function normalizeOpsLog(log) {
  const summary = [
    log.player_callsign,
    log.sector ? `Sector ${log.sector}` : "",
    log.weapon || "",
  ].filter(Boolean).join(" · ");

  return {
    id: `ops-${log.id}`,
    channel: "ops",
    title: log.title || "Untitled operation",
    detail: log.detail || summary,
    severity: log.severity || "routine",
    created_date: log.created_date,
    meta: log.event_type ? log.event_type.replace(/_/g, " ").toUpperCase() : "OPS",
  };
}

function normalizeServerLog(log) {
  return {
    id: `system-${log.id}`,
    channel: "system",
    title: log.detail || log.action || "System event",
    detail: log.actor_callsign || log.action || "",
    severity: log.severity || "info",
    created_date: log.created_date,
    meta: log.category ? log.category.replace(/_/g, " ").toUpperCase() : "SYSTEM",
  };
}

function FeedRow({ item }) {
  const config = CHANNEL_CONFIG[item.channel] || CHANNEL_CONFIG.comms;
  const Icon = config.icon;
  const severityClass = SEVERITY_CLASS[item.severity] || "text-foreground";

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-mono uppercase tracking-[0.18em] ${config.color}`}>
            {config.label}
          </span>
          <span className="text-[9px] text-muted-foreground/60 font-mono">{item.meta}</span>
          <span className="text-[9px] text-muted-foreground/50 font-mono">{moment(item.created_date).fromNow()}</span>
        </div>
        <p className={`text-[11px] leading-snug mt-0.5 ${severityClass}`}>{item.title}</p>
        {item.detail && (
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug truncate">{item.detail}</p>
        )}
      </div>
    </div>
  );
}

export default function CommsTelemetryWidget() {
  const [tab, setTab] = useState("all");
  const { user } = useCurrentUser();
  const isAdmin = isAdminOrGM(user);
  const worldQuery = useWorldState();
  const worldClock = useWorldClock(worldQuery.data);
  const tone = getAuthorityTone(worldClock.authorityStatus);
  const signalVariant = tone === "ok" ? "live" : tone === "warn" ? "stale" : tone === "error" ? "error" : "offline";

  const eventsQuery = useEntityQuery(
    "comms-telemetry-events",
    () => base44.entities.Event.list("-created_date", 20),
    { subscribeEntities: ["Event"], syncPolicy: "active" },
  );
  const { data: events = [] } = eventsQuery;

  const opsQuery = useEntityQuery(
    "comms-telemetry-ops",
    () => base44.entities.OpsLog.list("-created_date", 20),
    { subscribeEntities: ["OpsLog"], syncPolicy: "active" },
  );
  const { data: opsLogs = [] } = opsQuery;

  const serverLogQuery = useEntityQuery(
    ["comms-telemetry-server", user?.email || "anonymous"],
    () => isAdmin ? base44.entities.ServerLog.list("-created_date", 20) : Promise.resolve([]),
    {
      subscribeEntities: isAdmin ? ["ServerLog"] : [],
      syncPolicy: "active",
      queryOpts: { enabled: isAdmin },
    },
  );
  const { data: serverLogs = [] } = serverLogQuery;

  const feedItems = useMemo(() => {
    return [
      ...events.map(normalizeEvent),
      ...opsLogs.map(normalizeOpsLog),
      ...serverLogs.map(normalizeServerLog),
    ]
      .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
      .slice(0, 36);
  }, [events, opsLogs, serverLogs]);

  const counts = useMemo(() => {
    return feedItems.reduce((acc, item) => {
      acc[item.channel] = (acc[item.channel] || 0) + 1;
      return acc;
    }, { comms: 0, ops: 0, system: 0 });
  }, [feedItems]);

  const filteredItems = tab === "all"
    ? feedItems
    : feedItems.filter((item) => item.channel === tab);

  const headerTabs = [
    { key: "all", label: "ALL", count: feedItems.length },
    { key: "comms", label: "COMMS", count: counts.comms || 0 },
    { key: "ops", label: "OPS", count: counts.ops || 0 },
    ...(isAdmin ? [{ key: "system", label: "SYSTEM", count: counts.system || 0 }] : []),
  ];

  return (
    <DataCard
      title="Comms & Telemetry"
      subtitle={`${filteredItems.length} LIVE SIGNALS`}
      headerRight={(
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {headerTabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`h-6 px-2 rounded-sm border text-[9px] font-mono uppercase tracking-[0.18em] transition-colors ${
                tab === item.key
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label} {item.count}
            </button>
          ))}
        </div>
      )}
    >
      <div className="space-y-3">
        <div className="border border-border/60 bg-secondary/20 rounded-sm px-3 py-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1.5 min-w-0">
              <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] ${telemetryToneClass(tone)}`}>
                <TelemetrySignalSvg size={13} variant={signalVariant} animated={worldClock.authorityStatus === "verified"} />
                <span>{worldClock.authorityLabel}</span>
                <span className="text-muted-foreground">{worldClock.sourceLabel}</span>
                <span className="text-muted-foreground/70">{worldClock.freshnessLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-foreground">
                <WorldClockSvg size={14} className="text-primary" animated={worldClock.isTicking} />
                <span>{worldClock.displayDate}</span>
                <span className="text-primary/80">{worldClock.displayTimeWithSeconds}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <SeasonGlyphSvg size={12} variant={worldClock.seasonKey || "autumn"} className="text-primary/80" />
                  {worldClock.seasonLabel}
                </span>
                <span className="text-muted-foreground/30">/</span>
                <span className="inline-flex items-center gap-1.5">
                  <WeatherStatusSvg size={12} variant={worldClock.weatherKey || "overcast"} className="text-primary/80" />
                  {worldClock.weatherLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 min-w-[210px]">
              <StatChip label="Comms" value={counts.comms || 0} tone="text-primary" />
              <StatChip label="Ops" value={counts.ops || 0} tone="text-accent" />
              <StatChip label="System" value={isAdmin ? (counts.system || 0) : "LOCK"} tone="text-muted-foreground" />
            </div>
          </div>
          {worldClock.lastSyncError && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{worldClock.lastSyncError}</span>
            </div>
          )}
        </div>

        <div className="border border-border/60 rounded-sm overflow-hidden bg-card/40">
          {filteredItems.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Radio className="h-4 w-4 text-muted-foreground/50 mx-auto mb-2 animate-pulse" />
              <p className="text-[10px] text-muted-foreground font-mono tracking-widest">
                MONITORING CHANNELS...
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {filteredItems.map((item) => (
                <FeedRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DataCard>
  );
}

function StatChip({ label, value, tone }) {
  return (
    <div className="border border-border/50 bg-card/50 rounded-sm px-2 py-2 text-center">
      <div className={`text-sm font-bold font-display ${tone}`}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}
