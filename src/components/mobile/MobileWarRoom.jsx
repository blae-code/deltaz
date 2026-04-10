import MobileSummaryCard from "./MobileSummaryCard";
import MobileKpiRow from "./MobileKpiRow";
import { Crosshair, AlertTriangle, Shield, MapPin, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const THREAT_LEVEL = { minimal: 1, low: 2, moderate: 3, high: 4, critical: 5 };
const DIFF_COLOR = {
  suicide: "text-destructive", critical: "text-threat-orange",
  hazardous: "text-status-warn", routine: "text-status-ok",
};
const STATUS_COLOR = {
  available: "text-primary", in_progress: "text-status-ok",
  pending_verification: "text-status-warn", completed: "text-muted-foreground",
  failed: "text-destructive",
};
const THREAT_COLOR = {
  minimal: "text-status-ok", low: "text-status-ok",
  moderate: "text-status-warn", high: "text-threat-orange", critical: "text-destructive",
};
const THREAT_GLOW = {
  moderate: "animate-glow-pulse-subtle", high: "animate-glow-pulse-subtle",
  critical: "animate-glow-pulse-strong",
};

export default function MobileWarRoom({ jobs, territories, factions, diplomacy, events, loading }) {
  const activeJobs = jobs.filter(j => j.status === "in_progress");
  const criticalJobs = jobs.filter(j => j.difficulty === "critical" && j.status === "in_progress");
  const hotZones = territories.filter(t => THREAT_LEVEL[t.threat_level] >= 3);
  const hostileDiplo = diplomacy.filter(d => ["hostile", "war"].includes(d.status));
  const priorityJobs = jobs.filter(j => ["in_progress", "available", "pending_verification"].includes(j.status)).slice(0, 5);
  const topThreats = territories.filter(t => THREAT_LEVEL[t.threat_level] >= 2).slice(0, 5);

  const kpis = [
    { label: "ACTIVE OPS", value: loading ? "—" : activeJobs.length, color: criticalJobs.length ? "text-destructive" : "text-primary" },
    { label: "HOT ZONES", value: loading ? "—" : hotZones.length, color: hotZones.length > 2 ? "text-destructive" : "text-status-ok" },
    { label: "HOSTILE", value: loading ? "—" : hostileDiplo.length, color: hostileDiplo.length ? "text-threat-orange" : "text-status-ok" },
    { label: "INTEL", value: loading ? "—" : events.length, color: "text-primary" },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        <MobileKpiRow items={[{ label: "...", value: "—" }, { label: "...", value: "—" }, { label: "...", value: "—" }]} />
        <div className="text-[10px] text-muted-foreground text-center animate-pulse py-8">LOADING TACTICAL DATA...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileKpiRow items={kpis} />

      {/* Priority missions */}
      {priorityJobs.length > 0 && (
        <section>
          <h3 className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase font-mono mb-2 px-1">
            PRIORITY MISSIONS
          </h3>
          <div className="space-y-1.5">
            {priorityJobs.map(job => (
              <MobileSummaryCard
                key={job.id}
                icon={<Crosshair className="h-4 w-4" />}
                title={job.title}
                subtitle={`${job.type?.toUpperCase() || "MISSION"} · ${job.difficulty || "—"}`}
                status={job.status?.replace("_", " ")}
                statusColor={STATUS_COLOR[job.status]}
              />
            ))}
          </div>
        </section>
      )}

      {/* Threat sectors */}
      {topThreats.length > 0 && (
        <section>
          <h3 className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase font-mono mb-2 px-1">
            THREAT SECTORS
          </h3>
          <div className="space-y-1.5">
            {topThreats.map(t => {
              const lvl = t.threat_level || "minimal";
              const faction = factions.find(f => f.id === t.controlling_faction_id);
              return (
                <MobileSummaryCard
                  key={t.id}
                  icon={<MapPin className="h-4 w-4" />}
                  title={t.name}
                  subtitle={`${faction?.name || "UNCONTROLLED"} · ${t.sector}`}
                  status={lvl.toUpperCase()}
                  statusColor={THREAT_COLOR[lvl]}
                  glow={THREAT_GLOW[lvl]}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Factions snapshot */}
      {factions.length > 0 && (
        <section>
          <h3 className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase font-mono mb-2 px-1">
            FACTIONS ({factions.length})
          </h3>
          <div className="space-y-1.5">
            {factions.slice(0, 5).map(f => {
              const statuses = diplomacy.filter(d => d.faction_a_id === f.id || d.faction_b_id === f.id).map(d => d.status);
              const worst = statuses.sort((a, b) => ({ war: 5, hostile: 4, ceasefire: 3 }[b] || 0) - ({ war: 5, hostile: 4, ceasefire: 3 }[a] || 0))[0] || "neutral";
              return (
                <MobileSummaryCard
                  key={f.id}
                  icon={<Shield className="h-4 w-4" />}
                  title={f.name}
                  subtitle={f.tag ? `[${f.tag}]` : ""}
                  status={worst.replace("_", " ")}
                  statusColor={{ war: "text-destructive", hostile: "text-threat-orange", ceasefire: "text-status-warn", allied: "text-status-ok" }[worst] || "text-muted-foreground"}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Recent intel */}
      {events.length > 0 && (
        <section>
          <h3 className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase font-mono mb-2 px-1">
            LATEST INTEL
          </h3>
          <div className="space-y-1.5">
            {events.slice(0, 5).map(ev => (
              <MobileSummaryCard
                key={ev.id}
                icon={<Radio className="h-4 w-4" />}
                title={ev.title}
                subtitle={ev.description?.slice(0, 60)}
              />
            ))}
          </div>
        </section>
      )}

      {priorityJobs.length === 0 && topThreats.length === 0 && events.length === 0 && (
        <div className="text-center py-8 text-[10px] text-muted-foreground/50 font-mono">
          ALL SECTORS NOMINAL — NO PRIORITY ACTIONS
        </div>
      )}
    </div>
  );
}