import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Flag, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TerritoryCard from "./TerritoryCard";

const statusColors = {
  secured: "text-primary",
  contested: "text-accent",
  hostile: "text-destructive",
  uncharted: "text-muted-foreground",
};

export default function TerritoryOpsPanel() {
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [selectedTerritory, setSelectedTerritory] = useState("");
  const [targetFaction, setTargetFaction] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Territory.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
    ]).then(([t, f]) => {
      setTerritories(t);
      setFactions(f);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const territory = territories.find((t) => t.id === selectedTerritory);
  const currentFaction = territory ? factions.find((f) => f.id === territory.controlling_faction_id) : null;
  const target = factions.find((f) => f.id === targetFaction);

  const handleTransfer = async () => {
    if (!selectedTerritory || !targetFaction) return;
    setProcessing(true);

    const updateData = { controlling_faction_id: targetFaction };
    if (newStatus) updateData.status = newStatus;

    await base44.entities.Territory.update(selectedTerritory, updateData);

    // Update faction territory counts
    if (currentFaction) {
      await base44.entities.Faction.update(currentFaction.id, {
        territory_count: Math.max(0, (currentFaction.territory_count || 0) - 1),
      });
    }
    if (target) {
      await base44.entities.Faction.update(target.id, {
        territory_count: (target.territory_count || 0) + 1,
      });
    }

    // Broadcast event
    await base44.entities.Event.create({
      title: `Territory ${territory.name} ${currentFaction ? "transferred" : "claimed"} by ${target?.name || "Unknown"}`,
      content: currentFaction
        ? `Control of ${territory.name} (${territory.sector}) has been transferred from ${currentFaction.name} to ${target?.name}.`
        : `${target?.name} has claimed control of ${territory.name} (${territory.sector}).`,
      type: "faction_conflict",
      severity: "warning",
      territory_id: selectedTerritory,
      faction_id: targetFaction,
      is_active: true,
    });

    toast({
      title: currentFaction ? "Territory transferred" : "Territory claimed",
      description: `${territory.name} → ${target?.name}`,
    });

    setSelectedTerritory("");
    setTargetFaction("");
    setNewStatus("");
    loadData();
    setProcessing(false);
  };

  if (loading) {
    return <div className="text-[10px] text-primary animate-pulse tracking-widest">SCANNING TERRITORIES...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-muted-foreground">
        Claim uncontrolled territories or transfer control between factions. Changes are broadcast to all operatives in real-time.
      </p>

      {/* Territory selector */}
      <div>
        <Label className="text-[10px] font-mono tracking-wider">SELECT TERRITORY</Label>
        <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
          <SelectTrigger className="h-9 font-mono text-xs bg-muted mt-1">
            <SelectValue placeholder="Choose territory..." />
          </SelectTrigger>
          <SelectContent>
            {territories.map((t) => {
              const ctrl = factions.find((f) => f.id === t.controlling_faction_id);
              return (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">[{t.sector}]</span>
                    <span className="text-[10px]" style={{ color: ctrl?.color }}>
                      {ctrl?.tag || "UNCLAIMED"}
                    </span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Territory preview */}
      {territory && (
        <TerritoryCard
          territory={territory}
          currentFaction={currentFaction}
          factions={factions}
        />
      )}

      {/* Target faction */}
      <div>
        <Label className="text-[10px] font-mono tracking-wider">
          {currentFaction ? "TRANSFER TO FACTION" : "CLAIM FOR FACTION"}
        </Label>
        <Select value={targetFaction} onValueChange={setTargetFaction}>
          <SelectTrigger className="h-9 font-mono text-xs bg-muted mt-1">
            <SelectValue placeholder="Choose faction..." />
          </SelectTrigger>
          <SelectContent>
            {factions
              .filter((f) => f.id !== territory?.controlling_faction_id && f.status === "active")
              .map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <span className="flex items-center gap-2">
                    <Shield className="h-3 w-3" style={{ color: f.color }} />
                    <span>{f.name}</span>
                    <Badge variant="outline" className="text-[9px]">{f.tag}</Badge>
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Optional status change */}
      <div>
        <Label className="text-[10px] font-mono tracking-wider">NEW STATUS (OPTIONAL)</Label>
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger className="h-9 font-mono text-xs bg-muted mt-1">
            <SelectValue placeholder="Keep current status" />
          </SelectTrigger>
          <SelectContent>
            {["secured", "contested", "hostile", "uncharted"].map((s) => (
              <SelectItem key={s} value={s}>
                <span className={`uppercase text-xs ${statusColors[s]}`}>{s}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transfer preview */}
      {territory && target && (
        <div className="border border-accent/30 bg-accent/5 rounded-sm p-3">
          <div className="flex items-center justify-center gap-3 text-xs">
            <div className="text-center">
              <div className="text-[9px] text-muted-foreground tracking-wider mb-1">FROM</div>
              <div className="font-semibold" style={{ color: currentFaction?.color || "hsl(var(--muted-foreground))" }}>
                {currentFaction?.name || "UNCLAIMED"}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-accent" />
            <div className="text-center">
              <div className="text-[9px] text-muted-foreground tracking-wider mb-1">TO</div>
              <div className="font-semibold" style={{ color: target.color }}>
                {target.name}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execute button */}
      <Button
        onClick={handleTransfer}
        disabled={!selectedTerritory || !targetFaction || processing}
        className="w-full font-mono text-xs uppercase tracking-wider"
      >
        <Flag className="h-3.5 w-3.5 mr-2" />
        {processing
          ? "PROCESSING..."
          : currentFaction
          ? "EXECUTE TRANSFER"
          : "CLAIM TERRITORY"}
      </Button>
    </div>
  );
}