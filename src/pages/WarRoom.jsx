import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DataCard from "@/components/terminal/DataCard";
import StatusIndicator from "@/components/terminal/StatusIndicator";
import {
  Radar,
  Crosshair,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Zap,
  MapPin,
  Users,
  Target,
  Radio,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

const THREAT_LEVEL = { minimal: 1, low: 2, moderate: 3, high: 4, critical: 5 };
const THREAT_COLOR = {
  minimal:  "text-status-ok border-status-ok/30 bg-status-ok/5",
  low:      "text-status-ok border-status-ok/30 bg-status-ok/5",
  moderate: "text-status-warn border-status-warn/30 bg-status-warn/5",
  high:     "text-threat-orange border-threat-orange/30 bg-threat-orange/5",
  critical: "text-destructive border-destructive/30 bg-destructive/5",
};
const THREAT_GLOW = {
  minimal:  "",
  low:      "",
  moderate: "animate-glow-pulse-subtle",
  high:     "animate-glow-pulse-subtle",
  critical: "animate-glow-pulse-strong",
};

function age(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TrendIcon({ trend }) {
  if (trend === "up")   return <TrendingUp className="h-3 w-3 text-status-ok" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-destructive" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

// ── sub-components ────────────────────────────────────────────────────────────

function KpiTile({ icon: Icon, label, value, sub, color = "text-primary", trend }) {
  return (
    <div className="panel-frame clip-corner-tr p-4 relative group hover:border-primary/40 transition-all">
      <div className="absolute top-0 left-0 w-6 h-[2px] bg-primary/50 pointer-events-none" />
      <div className="flex items-start justify-between mb-2">
        <div className={cn("h-7 w-7 rounded-sm border flex items-center justify-center bg-card/60", color === "text-primary" ? "border-primary/25 text-primary" : `border-current/25 ${color}`)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {trend && <TrendIcon trend={trend} />}
      </div>
      <div className={cn("text-2xl font-bold font-display leading-none mb-1", color)}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest leading-tight">{label}</div>
      {sub && <div className="text-[9px] text-muted-foreground/60 mt-1">{sub}</div>}
    </div>
  );
}

function ThreatBadge({ level = "green" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border rounded-sm",
      THREAT_COLOR[level] || THREAT_COLOR.green
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      {level.toUpperCase()}
    </span>
  );
}

function MissionRow({ job }) {
  const statusColor = {
    available:             "text-primary",
    in_progress:           "text-status-ok",
    pending_verification:  "text-status-warn",
    completed:             "text-muted-foreground",
    failed:                "text-destructive",
    expired:               "text-muted-foreground/50",
  }[job.status] || "text-muted-foreground";

  const diffColor = {
    suicide:    "text-destructive",
    critical:   "text-threat-orange",
    hazardous:  "text-status-warn",
    routine:    "text-status-ok",
  }[job.difficulty] || "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 group hover:bg-secondary/20 -mx-3 px-3 transition-colors">
      <div className="shrink-0">
        <Crosshair className={cn("h-3.5 w-3.5", statusColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {job.title}
        </div>
        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
          {job.type?.toUpperCase() || "MISSION"} · {age(job.created_date)}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("text-[10px] uppercase tracking-wider font-mono", diffColor)}>
          {job.difficulty || "—"}
        </div>
        <div className={cn("text-[9px] uppercase tracking-widest", statusColor)}>{job.status?.replace("_", " ")}</div>
      </div>
    </div>
  );
}

function TerritoryRow({ territory, factions }) {
  const lvl = territory.threat_level || "minimal";
  const faction = factions?.find(f => f.id === territory.controlling_faction_id);
  return (
    <div className={cn(
      "flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 -mx-3 px-3",
      THREAT_GLOW[lvl]
    )}>
      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{territory.name}</div>
        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
          {faction?.name || "UNCONTROLLED"} · {territory.sector}
        </div>
      </div>
      <ThreatBadge level={lvl} />
    </div>
  );
}

function FactionRow({ faction, diplomacyList }) {
  // Determine most hostile diplomatic stance involving this faction
  const statuses = (diplomacyList || []).filter(
    d => d.faction_a_id === faction.id || d.faction_b_id === faction.id
  ).map(d => d.status);
  const statusPriority = { war: 5, hostile: 4, neutral: 2, ceasefire: 3, non_aggression: 2, trade_agreement: 1, allied: 0 };
  const worstStatus = statuses.sort((a, b) => (statusPriority[b] || 0) - (statusPriority[a] || 0))[0] || "neutral";
  const statusColor = {
    allied:          "text-status-ok",
    trade_agreement: "text-primary",
    ceasefire:       "text-status-warn",
    non_aggression:  "text-muted-foreground",
    neutral:         "text-muted-foreground",
    hostile:         "text-threat-orange",
    war:             "text-destructive",
  }[worstStatus] || "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{faction.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {faction.tag ? `[${faction.tag}]` : ""} {faction.status || "active"}
        </div>
      </div>
      <span className={cn("text-[10px] uppercase tracking-widest font-mono", statusColor)}>
        {worstStatus.replace("_", " ")}
      </span>
    </div>
  );
}

function IntelItem({ event }) {
  const typeIcon = {
    alert:    <AlertTriangle className="h-3 w-3 text-status-warn shrink-0" />,
    mission:  <Crosshair className="h-3 w-3 text-primary shrink-0" />,
    faction:  <Shield className="h-3 w-3 text-accent shrink-0" />,
    territory:<MapPin className="h-3 w-3 text-primary/70 shrink-0" />,
  }[event.type] || <Radio className="h-3 w-3 text-muted-foreground shrink-0" />;

  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0">
      <div className="mt-0.5">{typeIcon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-foreground leading-snug">{event.title}</div>
        {event.description && (
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{event.description}</div>
        )}
      </div>
      <div className="text-[9px] text-muted-foreground/60 font-mono shrink-0 mt-0.5">{age(event.created_date)}</div>
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────

export default function WarRoom() {
  const { isAdmin } = useOutletContext() || {};
  const [jobs, setJobs]             = useState([]);
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions]     = useState([]);
  const [events, setEvents]         = useState([]);
  const [diplomacy, setDiplomacy]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.allSettled([
      base44.entities.Job.list("-created_date", 20),
      base44.entities.Territory.list("-updated_date", 15),
      base44.entities.Faction.list("-created_date", 10),
      base44.entities.Event.list("-created_date", 20),
      base44.entities.Diplomacy.list("-created_date", 50),
    ]).then(([j, t, f, e, d]) => {
      setJobs(j.status === "fulfilled" ? j.value : []);
      setTerritories(t.status === "fulfilled" ? t.value : []);
      setFactions(f.status === "fulfilled" ? f.value : []);
      setEvents(e.status === "fulfilled" ? e.value : []);
      setDiplomacy(d.status === "fulfilled" ? d.value : []);
      setLoading(false);
    });

    // Real-time territory subscription
    let unsub;
    try {
      unsub = base44.entities.Territory.subscribe((event) => {
        if (event.type === "create") setTerritories(prev => [...prev, event.data]);
        else if (event.type === "update") setTerritories(prev => prev.map(t => t.id === event.id ? event.data : t));
        else if (event.type === "delete") setTerritories(prev => prev.filter(t => t.id !== event.id));
      });
    } catch (_) {}
    return () => { if (unsub) unsub(); };
  }, []);

  // Derived KPIs
  const activeJobs     = jobs.filter((j) => j.status === "in_progress");
  const criticalJobs   = jobs.filter((j) => j.difficulty === "critical" && j.status === "in_progress");
  const hotZones       = territories.filter((t) => THREAT_LEVEL[t.threat_level] >= 3);
  const hostileDiplo   = diplomacy.filter((d) => ["hostile", "war"].includes(d.status));
  const recentIntel    = events.slice(0, 15);
  const priorityJobs   = jobs.filter((j) => ["in_progress", "available", "pending_verification"].includes(j.status)).slice(0, 8);
  const highThreatTerr = territories.filter((t) => THREAT_LEVEL[t.threat_level] >= 2).slice(0, 8);

  // Overall theater threat
  const maxThreat = territories.reduce((max, t) => {
    const lvl = THREAT_LEVEL[t.threat_level] || 0;
    return lvl > max ? lvl : max;
  }, 0);
  const theaterThreat = Object.keys(THREAT_LEVEL).find((k) => THREAT_LEVEL[k] === maxThreat) || "minimal";

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Radar className="h-4 w-4 text-primary" />
            <h1 className="text-base font-bold font-display tracking-widest text-primary uppercase">
              War Room
            </h1>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono tracking-wider">
            TACTICAL COMMAND · THEATER OVERVIEW
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <Activity className="h-3 w-3 text-primary animate-pulse" />
            <span>LIVE</span>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 text-[10px] font-mono border px-2.5 py-1 rounded-sm",
            THREAT_COLOR[theaterThreat]
          )}>
            <Eye className="h-3 w-3" />
            <span>THEATER: {theaterThreat.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile
          icon={Crosshair}
          label="Active Missions"
          value={loading ? "—" : activeJobs.length}
          sub={criticalJobs.length ? `${criticalJobs.length} CRITICAL` : "all nominal"}
          trend={criticalJobs.length > 0 ? "down" : "up"}
        />
        <KpiTile
          icon={AlertTriangle}
          label="Hot Zones"
          value={loading ? "—" : hotZones.length}
          sub={`of ${territories.length} sectors`}
          color={hotZones.length > 2 ? "text-destructive" : hotZones.length > 0 ? "text-status-warn" : "text-status-ok"}
          trend={hotZones.length > 2 ? "down" : hotZones.length === 0 ? "up" : undefined}
        />
        <KpiTile
          icon={Shield}
          label="Hostile Relations"
          value={loading ? "—" : hostileDiplo.length}
          sub={`of ${diplomacy.length} diplomatic entries`}
          color={hostileDiplo.length > 0 ? "text-threat-orange" : "text-status-ok"}
        />
        <KpiTile
          icon={Zap}
          label="Intel Signals"
          value={loading ? "—" : recentIntel.length}
          sub="last 24h intercepts"
          color="text-primary"
          trend={recentIntel.length > 5 ? "up" : undefined}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Mission Priority Queue — 2 cols */}
        <div className="lg:col-span-2">
          <DataCard
            title="Mission Priority Queue"
            subtitle={`${priorityJobs.length} ACTIVE / PENDING`}
          >
            {loading ? (
              <div className="text-[11px] text-muted-foreground animate-pulse py-4 text-center">LOADING MISSION DATA...</div>
            ) : priorityJobs.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground/50 text-[11px] justify-center">
                <CheckCircle2 className="h-4 w-4" />
                <span>No active missions in queue</span>
              </div>
            ) : (
              <div className="-mx-3 px-0">
                {priorityJobs.map((job) => (
                  <MissionRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </DataCard>
        </div>

        {/* Intel Feed — 1 col */}
        <div>
          <DataCard title="Intel Feed" subtitle="INTERCEPTS">
            {loading ? (
              <div className="text-[11px] text-muted-foreground animate-pulse py-4 text-center">SCANNING...</div>
            ) : recentIntel.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/50 py-6 text-center">No recent signals</div>
            ) : (
              <div>
                {recentIntel.slice(0, 10).map((ev) => (
                  <IntelItem key={ev.id} event={ev} />
                ))}
              </div>
            )}
          </DataCard>
        </div>

        {/* Territory Status */}
        <div className="lg:col-span-2">
          <DataCard title="Territory Status" subtitle="THREAT ASSESSMENT">
            {loading ? (
              <div className="text-[11px] text-muted-foreground animate-pulse py-4 text-center">SCANNING SECTORS...</div>
            ) : highThreatTerr.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground/50 text-[11px] justify-center">
                <CheckCircle2 className="h-4 w-4" />
                <span>All sectors nominal</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <div>
                  {highThreatTerr.slice(0, 4).map((t) => (
                    <TerritoryRow key={t.id} territory={t} factions={factions} />
                  ))}
                </div>
                {highThreatTerr.length > 4 && (
                  <div>
                    {highThreatTerr.slice(4, 8).map((t) => (
                      <TerritoryRow key={t.id} territory={t} factions={factions} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </DataCard>
        </div>

        {/* Faction Disposition */}
        <div>
          <DataCard title="Faction Disposition" subtitle={`${factions.length} TRACKED`}>
            {loading ? (
              <div className="text-[11px] text-muted-foreground animate-pulse py-4 text-center">LOADING...</div>
            ) : factions.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/50 py-6 text-center">No factions tracked</div>
            ) : (
              <div>
                {factions.slice(0, 8).map((f) => (
                  <FactionRow key={f.id} faction={f} diplomacyList={diplomacy} />
                ))}
              </div>
            )}
          </DataCard>
        </div>

      </div>

      {/* Footer telemetry */}
      <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/40 tracking-widest pt-1">
        <div className="flex items-center gap-4">
          <span>JOBS: {jobs.length} INDEXED</span>
          <span>TERRITORIES: {territories.length} MAPPED</span>
          <span>FACTIONS: {factions.length} TRACKED</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-primary/50 animate-pulse" />
          <span>REAL-TIME SYNC ACTIVE</span>
        </div>
      </div>
    </div>
  );
}