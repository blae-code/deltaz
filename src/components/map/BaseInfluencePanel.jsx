import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Shield, Expand, Swords, Users, Zap, MapPin } from "lucide-react";
import DataCard from "../terminal/DataCard";

const THREAT_COLORS = {
  minimal: "text-status-ok",
  low: "text-status-info",
  moderate: "text-accent",
  high: "text-status-warn",
  critical: "text-destructive",
};

export default function BaseInfluencePanel({ sector, territories, bases, survivors, factions, onClose }) {
  const [expanding, setExpanding] = useState(false);
  const [defending, setDefending] = useState(false);

  const sectorTerritory = territories.find(t => t.sector === sector);
  const sectorBases = (bases || []).filter(b => b.sector === sector && b.status === "active");
  const controllingFaction = factions.find(f => f.id === sectorTerritory?.controlling_faction_id);

  const activeSurvivors = (survivors || []).filter(s => s.status === "active");
  const idleSurvivors = activeSurvivors.filter(s => s.current_task === "idle");
  const patrolSurvivors = activeSurvivors.filter(s => s.current_task === "patrol" || s.current_task === "defend");

  const wave = sectorTerritory?.active_threat_wave;
  const influence = sectorTerritory?.influence_level || 0;
  const defensePower = sectorTerritory?.defense_power || 0;

  const handleExpandInfluence = async () => {
    if (!sectorTerritory) {
      toast({ title: "No territory", description: "This sector has no territory record to expand.", variant: "destructive" });
      return;
    }
    setExpanding(true);
    const newInfluence = Math.min(100, influence + 15);
    await base44.entities.Territory.update(sectorTerritory.id, {
      influence_level: newInfluence,
      status: newInfluence >= 50 ? "secured" : sectorTerritory.status,
    });
    toast({ title: "Influence expanded", description: `Sector ${sector} influence: ${newInfluence}%` });
    setExpanding(false);
  };

  const handleAssignDefenders = async () => {
    if (!sectorTerritory) return;
    setDefending(true);

    // Auto-assign up to 3 idle survivors to patrol/defend
    const toAssign = idleSurvivors.slice(0, 3);
    if (toAssign.length === 0) {
      toast({ title: "No idle survivors", description: "All survivors are busy.", variant: "destructive" });
      setDefending(false);
      return;
    }

    for (const s of toAssign) {
      await base44.entities.Survivor.update(s.id, { current_task: "defend" });
    }

    const newDefense = defensePower + toAssign.reduce((sum, s) => sum + (s.combat_rating || 1), 0);
    const newCount = (sectorTerritory.defender_count || 0) + toAssign.length;
    await base44.entities.Territory.update(sectorTerritory.id, {
      defense_power: newDefense,
      defender_count: newCount,
    });

    toast({ title: "Defenders assigned", description: `${toAssign.length} survivors now defending ${sector}` });
    setDefending(false);
  };

  return (
    <DataCard
      title={`Sector ${sector} — Control`}
      headerRight={
        <button onClick={onClose} className="text-[9px] text-muted-foreground hover:text-foreground">✕</button>
      }
    >
      <div className="space-y-3">
        {/* Territory status */}
        {sectorTerritory ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Territory</span>
              <span className="text-[11px] font-mono text-foreground">{sectorTerritory.name}</span>
            </div>

            {controllingFaction && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Faction</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: controllingFaction.color }} />
                  <span className="text-[11px] font-mono">{controllingFaction.name}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</span>
              <Badge variant="outline" className="text-[8px] uppercase">{sectorTerritory.status}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Threat</span>
              <span className={`text-[11px] font-mono font-bold uppercase ${THREAT_COLORS[sectorTerritory.threat_level]}`}>
                {sectorTerritory.threat_level}
              </span>
            </div>

            {/* Influence bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wider">Influence</span>
                <span className="text-primary font-mono font-bold">{influence}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${influence}%` }} />
              </div>
            </div>

            {/* Defense bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wider">Defense Power</span>
                <span className="text-accent font-mono font-bold flex items-center gap-1">
                  <Shield className="h-3 w-3" /> {defensePower}
                  {sectorTerritory.defender_count > 0 && (
                    <span className="text-muted-foreground">({sectorTerritory.defender_count} defenders)</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(defensePower * 5, 100)}%` }} />
              </div>
            </div>

            {/* Resource nodes */}
            {sectorTerritory.resource_nodes?.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Resource Nodes</span>
                <div className="flex gap-1.5 flex-wrap">
                  {sectorTerritory.resource_nodes.map((n, i) => (
                    <Badge key={i} variant="outline" className={`text-[8px] ${n.depleted ? "line-through opacity-50" : ""}`}>
                      {n.type} {n.yield_rate > 0 && `+${n.yield_rate}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <MapPin className="h-4 w-4 text-muted-foreground/30 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Unclaimed sector — no territory record.</p>
          </div>
        )}

        {/* Active threat wave */}
        {wave?.status === "incoming" && (
          <div className="border border-destructive/30 bg-destructive/5 rounded-sm px-3 py-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <Swords className="h-3 w-3 text-destructive animate-pulse" />
              <span className="text-[10px] text-destructive font-bold uppercase tracking-wider">Incoming Threat</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{wave.threat_name || "Unknown threat"}</p>
            <div className="flex items-center gap-3 text-[9px]">
              <span className="text-destructive font-mono">STR: {wave.strength}</span>
              <span className="text-accent font-mono">DEF: {defensePower}</span>
              <span className={`font-mono font-bold ${defensePower >= wave.strength ? "text-status-ok" : "text-destructive"}`}>
                {defensePower >= wave.strength ? "HOLDING" : "AT RISK"}
              </span>
            </div>
          </div>
        )}

        {/* Bases in this sector */}
        {sectorBases.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bases in Sector</span>
            {sectorBases.map(b => (
              <div key={b.id} className="flex items-center justify-between border border-border rounded-sm px-2 py-1.5">
                <span className="text-[10px] font-mono">{b.name}</span>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[9px] font-mono text-muted-foreground">Def {b.defense_level || 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {sectorTerritory && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-[9px] uppercase tracking-wider h-8 gap-1"
              onClick={handleExpandInfluence}
              disabled={expanding || influence >= 100}
            >
              <Expand className="h-3 w-3" />
              {expanding ? "Expanding..." : "Expand Influence"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-[9px] uppercase tracking-wider h-8 gap-1"
              onClick={handleAssignDefenders}
              disabled={defending || idleSurvivors.length === 0}
            >
              <Users className="h-3 w-3" />
              {defending ? "Assigning..." : `Defend (${idleSurvivors.length} idle)`}
            </Button>
          </div>
        )}

        {/* Last wave result */}
        {sectorTerritory?.last_wave_result && (
          <div className="border border-border bg-secondary/30 rounded-sm px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Last Wave Result</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{sectorTerritory.last_wave_result}</p>
          </div>
        )}
      </div>
    </DataCard>
  );
}