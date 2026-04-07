import { useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../../hooks/useEntityQuery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Brain, Zap, Users, Heart, Utensils, Moon, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

const NEED_CONFIG = {
  hunger: { icon: Utensils, color: "text-accent", label: "Hunger" },
  social: { icon: Users, color: "text-primary", label: "Social" },
  rest: { icon: Moon, color: "text-status-info", label: "Rest" },
  stress: { icon: AlertTriangle, color: "text-destructive", label: "Stress" },
};

function NeedBar({ need, value, inverted }) {
  const cfg = NEED_CONFIG[need];
  const Icon = cfg?.icon || Heart;
  const displayVal = inverted ? 100 - value : value;
  const color = displayVal < 25 ? "bg-destructive" : displayVal < 50 ? "bg-accent" : "bg-status-ok";
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3 w-3 ${cfg?.color || "text-muted-foreground"} shrink-0`} />
      <span className="text-[9px] text-muted-foreground w-10 shrink-0">{cfg?.label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${displayVal}%` }} />
      </div>
      <span className="text-[9px] font-mono w-6 text-right">{value}</span>
    </div>
  );
}

export default function SurvivorAIPanel() {
  const [running, setRunning] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const { data: survivors = [], refetch } = useEntityQuery(
    "admin-ai-survivors",
    () => base44.entities.Survivor.filter({ status: "active" }, "-updated_date", 50),
    { subscribeEntities: ["Survivor"] }
  );

  const runTick = async () => {
    setRunning(true);
    const res = await base44.functions.invoke("survivorAI", { action: "tick" });
    if (res.data?.error) {
      toast({ title: "Failed", description: res.data.error, variant: "destructive" });
    } else {
      setLastResult(res.data);
      const drama = res.data.generated_drama;
      toast({
        title: "AI Tick Complete",
        description: `${res.data.survivors_processed} processed, ${res.data.drama_triggers} in crisis${drama ? `, drama: "${drama.title}"` : ""}`,
      });
      refetch();
    }
    setRunning(false);
  };

  const runAutoAssign = async () => {
    setAssigning(true);
    const res = await base44.functions.invoke("survivorAI", { action: "auto_assign" });
    if (res.data?.error) {
      toast({ title: "Failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: "Auto-Assign Complete", description: `${(res.data.assignments || []).length} survivors assigned to tasks` });
      refetch();
    }
    setAssigning(false);
  };

  const inCrisis = survivors.filter(s =>
    (s.hunger ?? 80) < 20 || (s.social ?? 60) < 15 || (s.rest ?? 70) < 15 || (s.stress ?? 20) > 80
  );
  const idleCount = survivors.filter(s => s.current_task === "idle").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold font-display text-foreground uppercase tracking-wider">Survivor AI</h3>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground border border-border">
            {survivors.length} active
          </span>
          {inCrisis.length > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/20">
              {inCrisis.length} in crisis
            </span>
          )}
          {idleCount > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent border border-accent/20">
              {idleCount} idle
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="text-[10px] uppercase tracking-wider h-7 gap-1" onClick={runAutoAssign} disabled={assigning}>
            {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            Auto-Assign Idle
          </Button>
          <Button size="sm" className="text-[10px] uppercase tracking-wider h-7 gap-1" onClick={runTick} disabled={running}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
            Run AI Tick
          </Button>
        </div>
      </div>

      {/* Last tick summary */}
      {lastResult?.summary && (
        <div className="border border-primary/20 bg-primary/5 rounded-sm px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3 w-3 text-primary" />
            <span className="text-[9px] text-primary uppercase tracking-wider font-semibold">Last Tick Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
            <div>Avg Hunger: <span className="text-accent font-bold">{lastResult.summary.avg_hunger}</span></div>
            <div>Avg Social: <span className="text-primary font-bold">{lastResult.summary.avg_social}</span></div>
            <div>Avg Rest: <span className="text-status-info font-bold">{lastResult.summary.avg_rest}</span></div>
            <div>Avg Stress: <span className="text-destructive font-bold">{lastResult.summary.avg_stress}</span></div>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
            <span>Processed: {lastResult.survivors_processed}</span>
            <span>In crisis: {lastResult.drama_triggers}</span>
            <span>New bonds: {lastResult.relationship_changes}</span>
          </div>
          {lastResult.generated_drama && (
            <div className="border-t border-primary/10 pt-2 mt-1">
              <div className="flex items-center gap-1.5 text-[10px]">
                <AlertTriangle className="h-3 w-3 text-accent" />
                <span className="text-foreground font-semibold">Drama Generated:</span>
                <span className="text-muted-foreground">{lastResult.generated_drama.title}</span>
                <Badge variant="outline" className="text-[7px]">{lastResult.generated_drama.severity}</Badge>
                <Badge variant="outline" className="text-[7px]">{lastResult.generated_drama.trigger_need}: {lastResult.generated_drama.trigger_label}</Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Survivor needs grid */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] text-muted-foreground tracking-widest uppercase font-mono">Individual Needs</h4>
        {survivors.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">No active survivors.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {survivors.slice(0, 30).map(s => {
              const crises = [];
              if ((s.hunger ?? 80) < 20) crises.push("starving");
              if ((s.social ?? 60) < 15) crises.push("isolated");
              if ((s.rest ?? 70) < 15) crises.push("exhausted");
              if ((s.stress ?? 20) > 80) crises.push("stressed");

              return (
                <div key={s.id} className={`border rounded-sm px-3 py-2 ${crises.length > 0 ? "border-destructive/20 bg-destructive/5" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-foreground truncate">{s.nickname || s.name}</span>
                      <Badge variant="outline" className="text-[7px]">{s.skill}</Badge>
                      <Badge variant="outline" className="text-[7px]">{s.current_task}</Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {crises.map(c => (
                        <span key={c} className="text-[7px] px-1 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/20">{c}</span>
                      ))}
                      <Badge variant="outline" className="text-[7px]">{s.morale}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <NeedBar need="hunger" value={s.hunger ?? 80} />
                    <NeedBar need="social" value={s.social ?? 60} />
                    <NeedBar need="rest" value={s.rest ?? 70} />
                    <NeedBar need="stress" value={s.stress ?? 20} inverted />
                  </div>
                  {s.ai_behavior_note && (
                    <p className="text-[8px] text-muted-foreground mt-1.5 italic">{s.ai_behavior_note}</p>
                  )}
                  {(s.relationships || []).length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <Heart className="h-2.5 w-2.5 text-primary/50" />
                      {s.relationships.slice(0, 3).map((r, i) => (
                        <span key={i} className="text-[7px] text-muted-foreground">
                          {r.name} ({r.strength > 0 ? "+" : ""}{r.strength})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}