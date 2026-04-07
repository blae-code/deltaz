import { useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../../hooks/useEntityQuery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Swords, Zap, Shield, CheckCircle } from "lucide-react";

export default function ThreatWavePanel() {
  const [generating, setGenerating] = useState(false);
  const [resolving, setResolving] = useState(false);

  const { data: territories = [], refetch } = useEntityQuery(
    "admin-threat-territories",
    () => base44.entities.Territory.list("-updated_date", 100),
    { subscribeEntities: ["Territory"] }
  );

  const activeWaves = territories.filter(t => t.active_threat_wave?.status === "incoming");

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await base44.functions.invoke("threatWaveEngine", { action: "generate" });
    if (res.data?.error) {
      toast({ title: "Failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: "Threat waves generated", description: `${res.data.waves_generated} new waves incoming` });
      refetch();
    }
    setGenerating(false);
  };

  const handleResolveAll = async () => {
    setResolving(true);
    const res = await base44.functions.invoke("threatWaveEngine", { action: "resolve_all" });
    if (res.data?.error) {
      toast({ title: "Failed", description: res.data.error, variant: "destructive" });
    } else {
      const held = (res.data.results || []).filter(r => r.held).length;
      const fell = (res.data.results || []).length - held;
      toast({ title: "Waves resolved", description: `${held} held, ${fell} breached` });
      refetch();
    }
    setResolving(false);
  };

  const handleResolveSingle = async (territoryId) => {
    setResolving(true);
    const res = await base44.functions.invoke("threatWaveEngine", { action: "resolve", territory_id: territoryId });
    if (res.data?.results?.length > 0) {
      const r = res.data.results[0];
      toast({ title: r.held ? "Defense held!" : "Sector breached", description: r.result.slice(0, 100) });
    }
    refetch();
    setResolving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-destructive" />
          <h3 className="text-xs font-bold font-display text-foreground uppercase tracking-wider">
            Threat Waves
          </h3>
          {activeWaves.length > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/20">
              {activeWaves.length} incoming
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="text-[10px] uppercase tracking-wider h-7 gap-1" onClick={handleGenerate} disabled={generating}>
            <Zap className="h-3 w-3" />
            {generating ? "Generating..." : "Generate Waves"}
          </Button>
          {activeWaves.length > 0 && (
            <Button variant="outline" size="sm" className="text-[10px] uppercase tracking-wider h-7 gap-1" onClick={handleResolveAll} disabled={resolving}>
              <CheckCircle className="h-3 w-3" />
              Resolve All
            </Button>
          )}
        </div>
      </div>

      {activeWaves.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-sm">
          <Shield className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">No active threat waves. The wasteland is quiet... for now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeWaves.map(t => {
            const w = t.active_threat_wave;
            const def = t.defense_power || 0;
            const held = def >= w.strength;
            return (
              <div key={t.id} className="border border-destructive/20 bg-destructive/5 rounded-sm px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords className="h-3.5 w-3.5 text-destructive animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-foreground">{w.threat_name}</span>
                    <Badge variant="outline" className="text-[8px]">{w.type}</Badge>
                  </div>
                  <Badge variant="outline" className="text-[8px] uppercase">Sector {t.sector}</Badge>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-mono">
                  <span className="text-destructive">ATK: {w.strength}</span>
                  <span className="text-accent">DEF: {def}</span>
                  <span className={held ? "text-status-ok font-bold" : "text-destructive font-bold"}>
                    {held ? "✓ HOLDING" : "✗ AT RISK"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[9px] uppercase tracking-wider h-6 gap-1 mt-1"
                  onClick={() => handleResolveSingle(t.id)}
                  disabled={resolving}
                >
                  Resolve Wave
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}