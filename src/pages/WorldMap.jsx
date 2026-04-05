import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map as MapIcon } from "lucide-react";
import ThreatBadge from "../components/ThreatBadge";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  stable: "border-primary/20",
  contested: "border-destructive/40 bg-destructive/5",
  lost: "border-muted-foreground/20 opacity-60",
  quarantined: "border-threat-yellow/40 bg-threat-yellow/5",
};

export default function WorldMap() {
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Territory.list("-created_date", 100).then(data => {
      setTerritories(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-primary animate-pulse-glow text-sm">MAPPING SECTORS...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-mono font-bold text-primary terminal-glow tracking-widest">SECTOR MAP</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">{territories.length} TERRITORIES TRACKED</p>
      </div>

      {territories.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <MapIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-mono text-xs text-muted-foreground">NO TERRITORIES MAPPED</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {territories.map(t => (
            <Card key={t.id} className={`bg-card border ${STATUS_STYLES[t.status] || "border-border"} hover:border-primary/30 transition-colors`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-mono font-bold text-foreground">{t.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground tracking-widest">SECTOR {t.sector}</div>
                  </div>
                  <ThreatBadge level={t.threat_level} />
                </div>
                <div className="space-y-1 mb-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">STATUS</span>
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${t.status === "contested" ? "text-destructive border-destructive/30" : ""}`}>
                      {t.status}
                    </Badge>
                  </div>
                  {t.controlling_faction && (
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">CONTROL</span>
                      <span className="text-foreground">{t.controlling_faction}</span>
                    </div>
                  )}
                  {t.coordinates && (
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">GRID</span>
                      <span className="text-foreground">{t.coordinates}</span>
                    </div>
                  )}
                </div>
                {t.notes && (
                  <p className="text-[10px] font-mono text-muted-foreground border-t border-border pt-2 mt-2 line-clamp-2">{t.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}