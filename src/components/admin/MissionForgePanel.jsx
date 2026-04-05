import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Loader2, Zap, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const diffColors = {
  routine: "text-primary",
  hazardous: "text-accent",
  critical: "text-destructive",
  suicide: "text-destructive font-bold",
};

export default function MissionForgePanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const runForge = async () => {
    setRunning(true);
    setResult(null);
    const res = await base44.functions.invoke("missionForge", {});
    setResult(res.data);
    toast({ title: `${res.data.generated} missions generated` });
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        MISSION FORGE analyzes territory status, faction resource needs, and current economic conditions
        to generate context-aware operations with tiered rewards. Scarce economies boost reputation payouts by 1.5x.
      </p>

      <Button onClick={runForge} disabled={running} className="w-full font-mono text-xs uppercase tracking-wider">
        {running ? (
          <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> FORGING MISSIONS...</>
        ) : (
          <><Crosshair className="h-3.5 w-3.5 mr-2" /> RUN MISSION FORGE</>
        )}
      </Button>

      {result && (
        <div className="space-y-3">
          {/* Economic context */}
          <div className="border border-border rounded-sm p-3 bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-muted-foreground tracking-widest">ECONOMIC CONDITIONS</span>
              <Badge variant="outline" className="text-[9px]">
                {result.economy_tier?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-muted-foreground">Avg Faction Wealth:</span>
              <span className="text-foreground font-semibold">{result.avg_faction_wealth}</span>
              {result.economy_tier === "scarce" && (
                <span className="text-accent flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> 1.5x REP BOOST ACTIVE
                </span>
              )}
            </div>
          </div>

          {/* Generated missions */}
          <div className="text-[9px] text-muted-foreground tracking-widest mb-1">
            GENERATED {result.generated} MISSIONS
          </div>
          <div className="space-y-2">
            {result.missions?.map((m, i) => (
              <div key={i} className="border border-border rounded-sm p-2.5 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px]">{m.type}</Badge>
                      <span className={`text-[9px] uppercase tracking-wider ${diffColors[m.difficulty] || "text-foreground"}`}>
                        {m.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="text-xs font-bold text-primary">+{m.reward}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">REP</span>
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