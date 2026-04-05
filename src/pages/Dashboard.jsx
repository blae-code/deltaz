import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Map, Radio, Users, AlertTriangle } from "lucide-react";
import ThreatBadge from "../components/ThreatBadge";
import PriorityBadge from "../components/PriorityBadge";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-sm ${accent || "bg-primary/10"}`}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="text-xl font-mono font-bold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Job.list("-created_date", 50),
      base44.entities.GameEvent.list("-created_date", 10),
      base44.entities.Territory.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
    ]).then(([j, e, t, f]) => {
      setJobs(j);
      setEvents(e);
      setTerritories(t);
      setFactions(f);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-primary animate-pulse-glow text-sm">LOADING SITREP...</div>
      </div>
    );
  }

  const activeJobs = jobs.filter(j => ["available", "accepted", "in_progress"].includes(j.status));
  const criticalEvents = events.filter(e => e.severity === "critical" || e.severity === "alert");
  const contested = territories.filter(t => t.status === "contested");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono font-bold text-primary terminal-glow tracking-widest">SITUATION REPORT</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">OPERATIONAL OVERVIEW // FIELD TERMINAL</p>
        </div>
        <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
          LIVE
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Crosshair} label="Active Jobs" value={activeJobs.length} />
        <StatCard icon={Map} label="Territories" value={territories.length} />
        <StatCard icon={Users} label="Factions" value={factions.length} />
        <StatCard icon={AlertTriangle} label="Contested Zones" value={contested.length} accent="bg-destructive/10" />
      </div>

      {/* Recent Events + Active Jobs side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Signal Feed */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
              <Radio className="w-3 h-3" /> SIGNAL FEED
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground">NO SIGNALS INTERCEPTED</p>
            ) : (
              events.slice(0, 6).map(evt => (
                <div key={evt.id} className="flex items-start gap-2 p-2 rounded-sm bg-muted/50 border border-border">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    evt.severity === "critical" ? "bg-destructive animate-pulse" :
                    evt.severity === "alert" ? "bg-threat-orange" :
                    evt.severity === "warning" ? "bg-threat-yellow" : "bg-primary"
                  }`} />
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-foreground truncate">{evt.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{evt.event_type?.toUpperCase()}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Jobs */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
              <Crosshair className="w-3 h-3" /> ACTIVE OPERATIONS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeJobs.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground">NO ACTIVE OPERATIONS</p>
            ) : (
              activeJobs.slice(0, 6).map(job => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded-sm bg-muted/50 border border-border">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono text-foreground truncate">{job.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{job.type?.toUpperCase()}</div>
                  </div>
                  <PriorityBadge priority={job.priority} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contested Territories */}
      {contested.length > 0 && (
        <Card className="bg-card border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-destructive tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> CONTESTED ZONES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {contested.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-sm bg-destructive/5 border border-destructive/20">
                  <div>
                    <div className="text-xs font-mono text-foreground">{t.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">SECTOR {t.sector}</div>
                  </div>
                  <ThreatBadge level={t.threat_level} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}