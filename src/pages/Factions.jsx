import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import StatusIndicator from "../components/terminal/StatusIndicator";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, MapPin } from "lucide-react";

const factionStatusMap = {
  active: "online",
  disbanded: "offline",
  hostile: "critical",
  allied: "online",
};

export default function Factions() {
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Faction.list("-created_date", 50)
      .then(setFactions)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">DECRYPTING CLAN DATA...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Clan Registry
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Known clans and their status</p>
      </div>

      {factions.length === 0 ? (
        <DataCard title="No Clans">
          <p className="text-xs text-muted-foreground">No clans registered in the system.</p>
        </DataCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {factions.map((faction) => (
            <div key={faction.id} className="border border-border bg-card rounded-sm overflow-hidden hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-secondary/30">
                <div
                  className="h-8 w-8 rounded-sm border flex items-center justify-center"
                  style={{
                    borderColor: faction.color || "hsl(var(--border))",
                    backgroundColor: (faction.color || "transparent") + "20",
                  }}
                >
                  <Shield className="h-4 w-4" style={{ color: faction.color || "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-display text-foreground">{faction.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{faction.tag}</Badge>
                  </div>
                </div>
                <StatusIndicator status={factionStatusMap[faction.status] || "offline"} label={faction.status} />
              </div>
              <div className="p-4 space-y-2">
                {faction.description && (
                  <p className="text-xs text-muted-foreground">{faction.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{faction.member_count || 0} MEMBERS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{faction.territory_count || 0} TERRITORIES</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}