import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Map, Shield } from "lucide-react";

export default function Factions() {
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Faction.list("-created_date", 50).then(data => {
      setFactions(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-primary animate-pulse-glow text-sm">LOADING FACTION INTEL...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-mono font-bold text-primary terminal-glow tracking-widest">FACTION REGISTRY</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">{factions.length} FACTIONS TRACKED</p>
      </div>

      {factions.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-mono text-xs text-muted-foreground">NO FACTIONS IN DATABASE</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {factions.map(f => (
            <Card key={f.id} className="bg-card border-border hover:border-primary/30 transition-colors" style={{ borderLeftColor: f.color, borderLeftWidth: 3 }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-mono font-bold text-foreground">{f.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground tracking-widest">[{f.code}]</div>
                  </div>
                  <Badge variant="outline" className={`font-mono text-[10px] uppercase ${f.status === "active" ? "text-primary border-primary/30" : "text-muted-foreground"}`}>
                    {f.status}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-3 line-clamp-2">{f.description}</p>
                <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{f.member_count || 0}</span>
                  <span className="flex items-center gap-1"><Map className="w-3 h-3" />{f.territory_count || 0} zones</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}