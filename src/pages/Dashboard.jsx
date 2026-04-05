import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import StatusIndicator from "../components/terminal/StatusIndicator";
import NotificationBanner from "../components/dashboard/NotificationBanner";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import IntelHighlights from "../components/dashboard/IntelHighlights";
import TacticalAdvisor from "../components/dashboard/TacticalAdvisor";
import WorldPulseStatus from "../components/dashboard/WorldPulseStatus";
import ScavengeLog from "../components/dashboard/ScavengeLog";
import ColonyMonitor from "../components/dashboard/ColonyMonitor";
import LiveEventWatcher from "../components/dashboard/LiveEventWatcher";
import TacticalMapWidget from "../components/dashboard/TacticalMapWidget";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Crosshair, Shield, Map } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Job.list("-created_date", 5),
      base44.entities.Event.list("-created_date", 5),
      base44.entities.Faction.list("-created_date", 10),
      base44.entities.Territory.list("-created_date", 10),
      base44.auth.me(),
    ])
      .then(([j, e, f, t, u]) => {
        setJobs(j);
        setEvents(e);
        setFactions(f);
        setTerritories(t);
        setUser(u);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">
          LOADING SITUATION REPORT...
        </div>
      </div>
    );
  }

  const severityColor = {
    info: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-accent/10 text-accent border-accent/20",
    critical: "bg-status-danger/10 text-status-danger border-status-danger/20",
    emergency: "bg-status-danger/15 text-status-danger border-status-danger/30",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Situation Report
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Operational overview — all sectors
        </p>
      </div>

      {/* Real-time event watcher — fires toasts on territory changes & new missions */}
      {user?.email && <LiveEventWatcher userEmail={user.email} />}

      {/* World Pulse Status */}
      <WorldPulseStatus isAdmin={user?.role === "admin"} />

      {/* Colony Status Monitor */}
      <ColonyMonitor isAdmin={user?.role === "admin" || user?.role === "game_master"} />

      {/* Notifications */}
      {user?.email && <NotificationBanner userEmail={user.email} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "ACTIVE MISSIONS",
            value: jobs.filter((j) => j.status === "available" || j.status === "in_progress").length,
            icon: Crosshair,
            color: "text-primary",
            description: "Missions currently available or being executed by operatives",
            detail: `${jobs.filter(j => j.status === "available").length} available · ${jobs.filter(j => j.status === "in_progress").length} in progress`
          },
          {
            label: "ACTIVE EVENTS",
            value: events.filter((e) => e.is_active).length,
            icon: AlertTriangle,
            color: "text-accent",
            description: "World events, broadcasts, and anomalies currently affecting the AO",
            detail: events.length > 0 ? `Latest: ${events[0]?.title?.substring(0, 30)}...` : "No recent events"
          },
          {
            label: "CLANS",
            value: factions.length,
            icon: Shield,
            color: "text-primary",
            description: "Registered factions operating across all sectors",
            detail: `${factions.filter(f => f.status === "active").length} active · ${factions.filter(f => f.status === "hostile").length} hostile`
          },
          {
            label: "TERRITORIES",
            value: territories.length,
            icon: Map,
            color: "text-accent",
            description: "Mapped zones across the 5×5 tactical grid",
            detail: `${territories.filter(t => t.status === "contested").length} contested · ${territories.filter(t => t.status === "hostile").length} hostile`
          },
        ].map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Tactical Map Overview */}
      <TacticalMapWidget />

      {/* Activity Feed (Live + Combat Log) */}
      <ActivityFeed />

      {/* Intel Highlights */}
      <IntelHighlights />

      {/* Scavenge Log */}
      <ScavengeLog />

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Missions */}
        <DataCard title="Latest Transmissions">
          {jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No missions available.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-start gap-3">
                  <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                    {job.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusIndicator status={job.status === "available" ? "online" : "warning"} />
                      <span className="text-[10px] text-muted-foreground uppercase">{job.difficulty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DataCard>

        {/* Tactical Advisor */}
        <TacticalAdvisor />
      </div>
    </div>
  );
}