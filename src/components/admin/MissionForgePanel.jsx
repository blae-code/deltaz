import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crosshair, Loader2, Zap, AlertTriangle, Coins, Cloud, Shield, Target } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const diffColors = {
  routine: "text-primary",
  hazardous: "text-accent",
  critical: "text-destructive",
  suicide: "text-destructive font-bold",
};

const COUNT_OPTIONS = [
  { value: "2", label: "2 Missions" },
  { value: "3", label: "3 Missions" },
  { value: "4", label: "4 Missions" },
  { value: "5", label: "5 Missions" },
  { value: "6", label: "6 Missions" },
];

export default function MissionForgePanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [count, setCount] = useState("3");
  const { toast } = useToast();

  const runForge = async () => {
    setRunning(true);
    setResult(null);
    const res = await base44.functions.invoke("missionForge", { count: parseInt(count) });
    setResult(res.data);
    if (res.data.error) {
      toast({ title: "Forge Failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: `${res.data.generated} missions generated` });
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        MISSION FORGE analyzes the complete world state — territory threats, colony resources, weather conditions, 
        faction economics, active threat waves, survivor capabilities, and base modules — to generate 
        context-aware operations with dynamically scaled rewards.
      </p>

      <div className="flex items-center gap-2">
        <Select value={count} onValueChange={setCount}>
          <SelectTrigger className="h-8 text-[10px] bg-secondary/50 border-border font-mono w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={runForge} disabled={running} className="flex-1 font-mono text-xs uppercase tracking-wider">
          {running ? (
            <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> ANALYZING WORLD STATE...</>
          ) : (
            <><Crosshair className="h-3.5 w-3.5 mr-2" /> RUN MISSION FORGE</>
          )}
        </Button>
      </div>

      {result && !result.error && (
        <div className="space-y-3">
          {/* World state summary */}
          <div className="border border-border rounded-sm p-3 bg-secondary/30 space-y-2">
            <div className="text-[9px] text-muted-foreground tracking-widest">WORLD STATE ANALYSIS</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-[8px] text-muted-foreground">URGENCY</div>
                <Badge variant="outline" className={`text-[9px] mt-0.5 ${
                  result.colony_urgency === 'critical' ? 'text-destructive border-destructive/30' :
                  result.colony_urgency === 'high' ? 'text-accent border-accent/30' :
                  'text-primary border-primary/30'
                }`}>
                  {(result.colony_urgency || 'normal').toUpperCase()}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-[8px] text-muted-foreground">WEATHER</div>
                <div className="text-[10px] text-foreground flex items-center justify-center gap-1 mt-0.5">
                  <Cloud className="h-2.5 w-2.5" /> {result.weather || '?'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[8px] text-muted-foreground">THREATS</div>
                <div className={`text-[10px] font-semibold mt-0.5 ${result.active_threats > 0 ? 'text-destructive' : 'text-status-ok'}`}>
                  {result.active_threats || 0} active
                </div>
              </div>
              <div className="text-center">
                <div className="text-[8px] text-muted-foreground">REWARD MOD</div>
                <div className="text-[10px] text-primary font-semibold mt-0.5">
                  {result.colony_urgency === 'critical' ? '1.5x' : result.colony_urgency === 'high' ? '1.25x' : '1.0x'}
                </div>
              </div>
            </div>
            {result.colony_urgency === 'critical' && (
              <div className="flex items-center gap-1.5 text-[9px] text-destructive">
                <AlertTriangle className="h-3 w-3" /> CRITICAL COLONY STATUS — maximum reward multiplier active
              </div>
            )}
          </div>

          {/* Generated missions */}
          <div className="text-[9px] text-muted-foreground tracking-widest">
            GENERATED {result.generated} MISSIONS
          </div>
          <div className="space-y-2">
            {result.missions?.map((m, i) => (
              <div key={i} className="border border-border rounded-sm p-2.5 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px]">{m.type}</Badge>
                      <span className={`text-[9px] uppercase tracking-wider ${diffColors[m.difficulty] || "text-foreground"}`}>
                        {m.difficulty}
                      </span>
                      {m.world_trigger && (
                        <Badge variant="outline" className="text-[7px] font-mono text-muted-foreground">
                          {m.world_trigger}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="text-xs font-bold text-primary">+{m.reward_rep}</span>
                    </div>
                    {m.reward_credits > 0 && (
                      <div className="flex items-center gap-1">
                        <Coins className="h-2.5 w-2.5 text-accent" />
                        <span className="text-[10px] text-accent">+{m.reward_credits}c</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}