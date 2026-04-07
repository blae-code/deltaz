import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import GeneratedMissionCard from "./GeneratedMissionCard";

const MISSION_TYPES = [
  { value: "any", label: "ANY TYPE" },
  { value: "recon", label: "RECON" },
  { value: "extraction", label: "EXTRACTION" },
  { value: "sabotage", label: "SABOTAGE" },
  { value: "escort", label: "ESCORT" },
  { value: "scavenge", label: "SCAVENGE" },
  { value: "elimination", label: "ELIMINATION" },
];

export default function MissionGenerator() {
  const [generating, setGenerating] = useState(false);
  const [preferredType, setPreferredType] = useState("any");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const payload = {};
      if (preferredType !== "any") payload.preferred_type = preferredType;
      const res = await base44.functions.invoke("generateMission", payload);
      if (res.data.error) {
        setError(res.data.error);
        toast({ title: "Generation Failed", description: res.data.error, variant: "destructive" });
      } else {
        setResult(res.data);
        toast({ title: "Mission Generated", description: res.data.mission.title });
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 border border-accent/20 bg-accent/5 rounded-sm p-3">
        <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] text-accent font-semibold tracking-wider">GHOST PROTOCOL — AI MISSION GENERATOR</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Analyzes live world conditions, territory threats, colony resources, faction conflicts, and your base capabilities 
            to generate a unique mission tailored to the current situation. Max 2 active generated missions.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={preferredType} onValueChange={setPreferredType}>
          <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MISSION_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={generate}
          disabled={generating}
          className="flex-1 font-mono text-[10px] uppercase tracking-wider h-7"
          size="sm"
        >
          {generating ? (
            <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> ANALYZING WORLD STATE...</>
          ) : (
            <><Sparkles className="h-3 w-3 mr-1.5" /> GENERATE MISSION</>
          )}
        </Button>
      </div>

      {error && (
        <div className="text-[10px] text-destructive border border-destructive/20 bg-destructive/5 rounded-sm p-2">
          {error}
        </div>
      )}

      {/* Colony urgency indicator */}
      {result?.colony_urgency && result.colony_urgency !== "normal" && (
        <div className={`text-[9px] font-mono tracking-wider px-2.5 py-1.5 rounded-sm border ${
          result.colony_urgency === "critical" ? "border-destructive/30 bg-destructive/5 text-destructive" :
          result.colony_urgency === "high" ? "border-accent/30 bg-accent/5 text-accent" :
          "border-primary/30 bg-primary/5 text-primary"
        }`}>
          COLONY URGENCY: {result.colony_urgency.toUpperCase()} — rewards {result.colony_urgency === "critical" ? "1.5x" : "1.25x"} boosted
        </div>
      )}

      {result?.mission && <GeneratedMissionCard mission={result.mission} />}
    </div>
  );
}