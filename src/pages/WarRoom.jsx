import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import TacticalAdvisor from "@/components/dashboard/TacticalAdvisor";
import TacticalMapWidget from "@/components/dashboard/TacticalMapWidget";
import { Crosshair, Shield, AlertTriangle, Radio, Clock, Target, Zap, MapPin, ChevronRight } from "lucide-react";
import moment from "moment";

const STATUS_DOT = {
  secured:   "bg-status-ok",
  contested: "bg-status-warn",
  hostile:   "bg-status-danger",
  uncharted: "bg-muted-foreground/50",
};
const STATUS_TEXT = {
  secured:   "text-status-ok",
  contested: "text-status-warn",
  hostile:   "text-status-danger",
  uncharted: "text-muted-foreground",
};
const THREAT_COLOR = {
  critical: "text-status-danger",
  high:     "text-status-warn",
  medium:   "text-primary",
  low:      "text-muted-foreground",
};
const THREAT_DOT = {
  critical: "bg-status-danger animate-pulse",
  high:     "bg-status-warn",
  medium:   "bg-primary/60",
  low:      "bg-muted-foreground/40",
};
const SEVERITY_COLOR = {
  emergency: "text-status-danger",
  critical:  "text-status-danger",
  warning:   "text-status-warn",
  normal:    "text-muted-foreground",
};
const FACTION_STATUS_DOT = {
  active:    "bg-status-ok",
  hostile:   "bg-status-danger",
  neutral:   "bg-muted-foreground/50",
  allied:    "bg-primary/70",
  dissolved: "bg-muted-foreground/30",
};

function SectionHeader({ label, count, countLabel }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-secondary/60">
      <div className="h-0.5 w-2.5 bg-primary/70 shrink-0" />
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary font-display flex-1">
        {label}
      </h3>
      {count !== undefined && (
        <span className="text-[9px] text-muted-foreground font-mono">
          {count}{countLabel ? ` ${countLabel}` : ""}
        </span>
      )}
    </div>
  );
}

export default function WarRoom() {
  const [jobs, setJobs] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Job.list("-created_date", 50),
      base44.entities.Territory.list("-created_date", 100),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Event.list("-created_date", 30),
      base44.auth.me(),
    ])
      .then(([j, t, f, e]) => {
        setJobs(j);
        setTerritories(t);
        setFactions(f);
        setEvents(e);
      })
      .finally(() => setLoading(false));

    const unsub = base44.entities.Territory.subscribe((ev) => {
      if (ev.type === "update")
        setTerritories((p) => p.map((t) => (t.id === ev.id ? ev.data : t)));
      else if (ev.type === "create")
        setTerritories((p) => [ev.data, ...p]);
    });
    return unsub;
  }, []);

  // Derived
  const activeJobs = jobs.filter(
    (j) => j.status === "available" || j.status === "in_progress"
  );
  const criticalJobs = jobs.filter(
    (j) => j.threat_level === "critical" || j.priority === "critical"
  );
  const hostileTerritories = territories.filter((t) => t.status === "hostile");
  const contestedTerritories = territories.filter((t) => t.status === "contested");
  const activeFactions = factions.filter((f) => f.status === "active");
  const criticalEvents = events.filter(
    (e) => e.severity === "critical" || e.severity === "emergency"
  );

  // Priority queue: critical first, then by created date
  const priorityQueue = [...activeJobs]
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      const ra = rank[a.threat_level] ?? rank[a.priority] ?? 2;
      const rb = rank[b.threat_level] ?? rank[b.priority] ?? 2;
      return ra - rb;
    })
    .slice(0, 12);

  const recentEvents = events.slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse font-mono">
          INITIALIZING WAR ROOM...
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "ACTIVE MISSIONS",
      value: activeJobs.length,
      sub: `${criticalJobs.length} critical`,
      color: "text-primary",
      icon: Crosshair,
    },
    {
      label: "HOSTILE ZONES",
      value: hostileTerritories.length,
      sub: `${contestedTerritories.length} contested`,
      color: "text-status-danger",
      icon: AlertTriangle,
    },
    {
      label: "ACTIVE CLANS",
      value: activeFactions.length,
      sub: `${factions.length} total registered`,
      color: "text-primary",
      icon: Shield,
    },
    {
      label: "CRITICAL EVENTS",
      value: criticalEvents.length,
      sub: `${events.length} total tracked`,
      color: "text-status-warn",
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-4 bg-primary" />
            <span className="text-[9px] text-primary/60 tracking-[0.3em] font-mono uppercase">
              Strategic Ops
            </span>
          </div>
          <h2 className="text-xl font-bold font-display tracking-wider text-primary uppercase">
            [ WAR ROOM ]
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider">
            Tactical operations center — real-time situational awareness
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-status-danger animate-pulse" />
          <span className="text-[9px] text-primary font-mono tracking-widest">
            COMBAT ACTIVE
          </span>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="panel-frame clip-corner-tr p-3 relative">
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-primary/60" />
            <div className="flex items-center gap-2 mb-1.5">
              <kpi.icon className={`h-3.5 w-3.5 shrink-0 ${kpi.color}`} />
              <span className="text-[8px] text-muted-foreground tracking-[0.15em] uppercase flex-1">
                {kpi.label}
              </span>
            </div>
            <div className={`text-2xl font-bold font-display ${kpi.color}`}>
              {kpi.value}
            </div>
            <div className="text-[8px] text-muted-foreground mt-0.5 tracking-wider">
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Tactical Map + Mission Priority Queue */}
        <div className="lg:col-span-7 space-y-3">
          {/* Tactical Map */}
          <TacticalMapWidget />

          {/* Mission Priority Queue */}
          <div className="panel-frame overflow-hidden">
            <SectionHeader
              label="[ Mission Priority Queue ]"
              count={priorityQueue.length}
              countLabel="active"
            />
            {priorityQueue.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-muted-foreground tracking-widest">
                NO ACTIVE MISSIONS
              </div>
            ) : (
              <div className="divide-y divide-border/30 max-h-56 overflow-y-auto">
                {priorityQueue.map((job) => {
                  const tLevel = job.threat_level || job.priority || "medium";
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/30 transition-colors group"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${THREAT_DOT[tLevel] || "bg-muted-foreground/40"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-mono font-semibold text-foreground truncate leading-tight">
                          {job.title}
                        </p>
                        <p className="text-[8px] text-muted-foreground leading-tight mt-0.5">
                          {job.type && <span className="uppercase">{job.type}</span>}
                          {job.sector && <span> · {job.sector}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[8px] font-mono uppercase tracking-wider ${THREAT_COLOR[tLevel] || "text-muted-foreground"}`}
                        >
                          {tLevel}
                        </span>
                        <span className="text-[8px] text-muted-foreground font-mono">
                          {moment(job.created_date).fromNow(true)}
                        </span>
                        <span
                          className={`text-[8px] font-mono px-1.5 py-0.5 border ${
                            job.status === "in_progress"
                              ? "border-primary/40 text-primary bg-primary/5"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {job.status?.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Territory Status + Faction Disposition */}
        <div className="lg:col-span-5 space-y-3">
          {/* Territory Status */}
          <div className="panel-frame overflow-hidden">
            <SectionHeader
              label="[ Territory Status ]"
              count={territories.length}
              countLabel="zones"
            />
            {territories.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-muted-foreground tracking-widest">
                NO TERRITORY DATA
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
                {territories.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/30 transition-colors"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[t.status] || "bg-muted-foreground/30"}`}
                    />
                    <span className="text-[9px] font-mono text-foreground truncate flex-1">
                      {t.name}
                    </span>
                    {t.sector && (
                      <span className="text-[8px] font-mono text-muted-foreground shrink-0">
                        [{t.sector}]
                      </span>
                    )}
                    <span
                      className={`text-[8px] font-mono uppercase tracking-wider shrink-0 ${STATUS_TEXT[t.status] || "text-muted-foreground"}`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Faction Disposition */}
          <div className="panel-frame overflow-hidden">
            <SectionHeader
              label="[ Faction Disposition ]"
              count={factions.length}
              countLabel="registered"
            />
            {factions.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-muted-foreground tracking-widest">
                NO FACTION DATA
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto divide-y divide-border/30">
                {factions.map((f) => {
                  const controlled = territories.filter(
                    (t) => t.controlling_faction_id === f.id
                  ).length;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/30 transition-colors"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${FACTION_STATUS_DOT[f.status] || "bg-muted-foreground/30"}`}
                      />
                      <span className="text-[9px] font-mono text-foreground truncate flex-1">
                        {f.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {controlled > 0 && (
                          <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            <span>{controlled}</span>
                          </div>
                        )}
                        <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">
                          {f.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ARTEMIS Tactical Advisor */}
          <TacticalAdvisor />
        </div>
      </div>

      {/* ── Intel Feed ── */}
      <div className="panel-frame overflow-hidden">
        <SectionHeader
          label="[ Intel Feed ]"
          count={recentEvents.length}
          countLabel="entries"
        />
        {recentEvents.length === 0 ? (
          <div className="p-4 text-center text-[10px] text-muted-foreground tracking-widest">
            NO RECENT INTEL
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {recentEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 px-3 py-2 hover:bg-secondary/20 transition-colors"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${
                    ev.severity === "critical" || ev.severity === "emergency"
                      ? "bg-status-danger animate-pulse"
                      : ev.severity === "warning"
                      ? "bg-status-warn"
                      : "bg-muted-foreground/40"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono text-foreground leading-tight">
                    {ev.title}
                  </p>
                  {ev.description && (
                    <p className="text-[8px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
                      {ev.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  {ev.severity && ev.severity !== "normal" && (
                    <span
                      className={`text-[8px] font-mono uppercase tracking-wider ${SEVERITY_COLOR[ev.severity] || "text-muted-foreground"}`}
                    >
                      {ev.severity}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-[8px] text-muted-foreground font-mono">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{moment(ev.created_date).fromNow(true)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
