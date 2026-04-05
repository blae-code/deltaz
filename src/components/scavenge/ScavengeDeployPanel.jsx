import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const threatColor = {
  minimal: "text-status-ok",
  low: "text-status-ok",
  moderate: "text-status-warn",
  high: "text-status-danger",
  critical: "text-status-danger",
};

export default function ScavengeDeployPanel({ territories, factions, onDeployed }) {
  const [selectedTerritory, setSelectedTerritory] = useState("");
  const [deploying, setDeploying] = useState(false);
  const { toast } = useToast();

  const territory = territories.find((t) => t.id === selectedTerritory);
  const controller = territory ? factions.find((f) => f.id === territory.controlling_faction_id) : null;

  const handleDeploy = async () => {
    if (!selectedTerritory) return;
    setDeploying(true);
    const res = await base44.functions.invoke("scavengeRun", { territory_id: selectedTerritory });
    if (res.data.error) {
      toast({ title: "Deploy Failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: "Scavenge Complete!", description: `${res.data.total_value} credits recovered` });
      onDeployed?.(res.data);
    }
    setDeploying(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Select Territory</Label>
        <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
          <SelectTrigger className="h-8 text-[11px] bg-secondary/50 border-border font-mono mt-1">
            <SelectValue placeholder="Choose target zone..." />
          </SelectTrigger>
          <SelectContent>
            {territories.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.sector}) — {t.threat_level || "unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Territory Intel Preview */}
      {territory && (
        <div className="border border-border bg-secondary/20 rounded-sm p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground">{territory.name}</span>
            <Badge variant="outline" className={`text-[8px] uppercase ${threatColor[territory.threat_level] || ""}`}>
              {territory.threat_level || "unknown"}
            </Badge>
          </div>
          <div className="text-[9px] text-muted-foreground">
            Sector {territory.sector} · Status: {territory.status} · Controller: {controller?.name || "Unclaimed"}
          </div>
          {(territory.resources || []).length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {territory.resources.map((r) => (
                <span key={r} className="text-[8px] font-mono text-primary bg-primary/10 px-1 py-0.5 rounded-sm">{r}</span>
              ))}
            </div>
          )}
          {(territory.threat_level === "high" || territory.threat_level === "critical") && (
            <div className="flex items-center gap-1 text-[9px] text-status-warn mt-1">
              <AlertTriangle className="h-3 w-3" />
              <span>High risk — complications likely</span>
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        onClick={handleDeploy}
        disabled={!selectedTerritory || deploying}
        className="w-full font-mono text-xs uppercase tracking-wider"
      >
        {deploying ? (
          <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> SCOUTING IN PROGRESS...</>
        ) : (
          <><Search className="h-3 w-3 mr-1" /> DEPLOY SCOUT</>
        )}
      </Button>
    </div>
  );
}