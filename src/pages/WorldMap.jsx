import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import StatusIndicator from "../components/terminal/StatusIndicator";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

const threatColors = {
  minimal: "text-primary",
  low: "text-chart-4",
  moderate: "text-accent",
  high: "text-destructive",
  critical: "text-destructive",
};

const statusColors = {
  secured: "online",
  contested: "warning",
  hostile: "critical",
  uncharted: "offline",
};

export default function WorldMap() {
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Territory.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
    ])
      .then(([t, f]) => {
        setTerritories(t);
        setFactions(f);
      })
      .finally(() => setLoading(false));
  }, []);

  const getFactionName = (id) => factions.find((f) => f.id === id)?.name || "UNCLAIMED";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">SCANNING SECTORS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Area of Operations
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Territory control and threat assessment</p>
      </div>

      {/* Territory Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {territories.length === 0 ? (
          <DataCard title="No Territories">
            <p className="text-xs text-muted-foreground">No territories discovered yet.</p>
          </DataCard>
        ) : (
          territories.map((t) => (
            <div key={t.id} className="border border-border bg-card rounded-sm p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{t.name}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{t.sector}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground tracking-wider">STATUS</span>
                  <StatusIndicator status={statusColors[t.status] || "offline"} label={t.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground tracking-wider">THREAT</span>
                  <span className={`text-[10px] font-semibold uppercase ${threatColors[t.threat_level] || "text-muted-foreground"}`}>
                    {t.threat_level}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground tracking-wider">CONTROL</span>
                  <span className="text-[10px] text-foreground">{getFactionName(t.controlling_faction_id)}</span>
                </div>
                {t.resources?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.resources.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[9px]">{r}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}