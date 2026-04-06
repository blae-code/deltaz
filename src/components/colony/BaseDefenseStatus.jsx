import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Swords, Loader2, Users, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BaseDefenseStatus({ baseId, isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState(false);
  const [attackResult, setAttackResult] = useState(null);
  const { toast } = useToast();

  const loadStatus = () => {
    setLoading(true);
    base44.functions.invoke("settlementSim", { action: "get_base_status", base_id: baseId })
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (baseId) loadStatus();
  }, [baseId]);

  const handleAttack = async () => {
    setAttacking(true);
    setAttackResult(null);
    const res = await base44.functions.invoke("settlementSim", { action: "trigger_defense", base_id: baseId });
    setAttackResult(res.data);
    toast({ title: res.data.victory ? "Base defended!" : "Base overrun!", variant: res.data.victory ? "default" : "destructive" });
    loadStatus();
    setAttacking(false);
  };

  if (loading) {
    return <div className="text-[10px] text-muted-foreground animate-pulse py-3 text-center">Scanning defense systems...</div>;
  }

  if (!data || data.error) return null;

  const readiness = data.defense_power;
  const readinessLevel = readiness >= 50 ? "FORTIFIED" : readiness >= 30 ? "DEFENDED" : readiness >= 15 ? "VULNERABLE" : "EXPOSED";
  const readinessColor = readiness >= 50 ? "text-status-ok" : readiness >= 30 ? "text-primary" : readiness >= 15 ? "text-status-warn" : "text-status-danger";

  return (
    <div className="space-y-3">
      {/* Defense Power */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`h-4 w-4 ${readinessColor}`} />
          <div>
            <div className={`text-sm font-bold font-mono ${readinessColor}`}>{readiness}</div>
            <div className="text-[8px] text-muted-foreground tracking-wider">DEFENSE POWER</div>
          </div>
        </div>
        <Badge className={`text-[9px] ${readinessColor} bg-transparent border`}>{readinessLevel}</Badge>
      </div>

      {/* Defense bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full transition-all rounded-full ${readiness >= 50 ? 'bg-status-ok' : readiness >= 30 ? 'bg-primary' : readiness >= 15 ? 'bg-status-warn' : 'bg-status-danger'}`}
          style={{ width: `${Math.min(100, readiness)}%` }}
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary/30 rounded-sm p-2 flex items-center gap-2">
          <Eye className="h-3 w-3 text-primary" />
          <div>
            <div className="text-[10px] font-bold text-foreground">{data.patrolling}</div>
            <div className="text-[8px] text-muted-foreground">Patrolling</div>
          </div>
        </div>
        <div className="bg-secondary/30 rounded-sm p-2 flex items-center gap-2">
          <Shield className="h-3 w-3 text-accent" />
          <div>
            <div className="text-[10px] font-bold text-foreground">{data.guards}</div>
            <div className="text-[8px] text-muted-foreground">Guards</div>
          </div>
        </div>
        <div className="bg-secondary/30 rounded-sm p-2 flex items-center gap-2">
          <Users className="h-3 w-3 text-primary" />
          <div>
            <div className="text-[10px] font-bold text-foreground">{data.working}</div>
            <div className="text-[8px] text-muted-foreground">Working</div>
          </div>
        </div>
        <div className="bg-secondary/30 rounded-sm p-2 flex items-center gap-2">
          <Users className="h-3 w-3 text-muted-foreground" />
          <div>
            <div className="text-[10px] font-bold text-foreground">{data.idle}</div>
            <div className="text-[8px] text-muted-foreground">Idle</div>
          </div>
        </div>
      </div>

      {/* Task summary */}
      {data.task_summary && Object.values(data.task_summary).some(v => v > 0) && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(data.task_summary).filter(([, v]) => v > 0).map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-[8px] gap-1">
              {count}× {type}
            </Badge>
          ))}
        </div>
      )}

      {/* Attack result */}
      {attackResult && (
        <div className={`border rounded-sm p-2.5 ${attackResult.victory ? "border-status-ok/30 bg-status-ok/5" : "border-status-danger/30 bg-status-danger/5"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Swords className={`h-3.5 w-3.5 ${attackResult.victory ? "text-status-ok" : "text-status-danger"}`} />
            <span className={`text-[10px] font-bold ${attackResult.victory ? "text-status-ok" : "text-status-danger"}`}>
              {attackResult.victory ? "DEFENSE SUCCESSFUL" : "BASE OVERRUN"}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">{attackResult.narrative}</p>
          <div className="flex gap-3 mt-1.5 text-[8px] text-muted-foreground">
            <span>DEF: {attackResult.defense_power} vs THR: {attackResult.threat_strength}</span>
            <span>Defenders: {attackResult.defenders_count}</span>
            {attackResult.injuries > 0 && <span className="text-status-danger">Injuries: {attackResult.injuries}</span>}
          </div>
        </div>
      )}

      {/* Admin attack trigger */}
      {isAdmin && (
        <Button size="sm" variant="destructive" className="w-full h-7 text-[9px] font-mono tracking-wider" onClick={handleAttack} disabled={attacking}>
          {attacking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Swords className="h-3 w-3 mr-1" />}
          {attacking ? "SIMULATING ATTACK..." : "SIMULATE BASE ATTACK"}
        </Button>
      )}
    </div>
  );
}