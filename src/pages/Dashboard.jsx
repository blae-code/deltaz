import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import StatusIndicator from "../components/terminal/StatusIndicator";
import NotificationBanner from "../components/dashboard/NotificationBanner";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Crosshair, Shield, Map } from "lucide-react";

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
    info: "bg-primary/20 text-primary border-primary/30",
    warning: "bg-accent/20 text-accent border-accent/30",
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    emergency: "bg-destructive/30 text-destructive border-destructive/50",
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

      {/* Notifications */}
      {user?.email && <NotificationBanner userEmail={user.email} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ACTIVE MISSIONS", value: jobs.filter((j) => j.status === "available" || j.status === "in_progress").length, icon: Crosshair, color: "text-primary" },
          { label: "ACTIVE EVENTS", value: events.filter((e) => e.is_active).length, icon: AlertTriangle, color: "text-accent" },
          { label: "FACTIONS", value: factions.length, icon: Shield, color: "text-chart-4" },
          { label: "TERRITORIES", value: territories.length, icon: Map, color: "text-chart-5" },
        ].map((stat) => (
          <div key={stat.label} className="border border-border bg-card rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground tracking-widest">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold font-display ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Events */}
        <DataCard title="Latest Transmissions">
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No transmissions intercepted.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className={`mt-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityColor[event.severity] || severityColor.info}`}>
                    {event.severity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{event.type?.replace("_", " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DataCard>

        {/* Active Jobs */}
        <DataCard title="Mission Board">
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
      </div>
    </div>
  );
}