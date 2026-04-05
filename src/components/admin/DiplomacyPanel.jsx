import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import DiplomacyMatrix from "./DiplomacyMatrix";
import DiplomacyForm from "./DiplomacyForm";
import DiplomacyLog from "./DiplomacyLog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function DiplomacyPanel() {
  const [factions, setFactions] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    const [f, r] = await Promise.all([
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Diplomacy.list("-updated_date", 100),
    ]);
    setFactions(f.filter((x) => x.status === "active"));
    setRelations(r);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const getRelation = (aId, bId) => {
    return relations.find(
      (r) =>
        (r.faction_a_id === aId && r.faction_b_id === bId) ||
        (r.faction_a_id === bId && r.faction_b_id === aId)
    );
  };

  const setRelation = async ({ factionAId, factionBId, status, terms }) => {
    const existing = getRelation(factionAId, factionBId);
    const fA = factions.find((f) => f.id === factionAId);
    const fB = factions.find((f) => f.id === factionBId);

    if (existing) {
      await base44.entities.Diplomacy.update(existing.id, {
        status,
        terms,
        previous_status: existing.status,
        initiated_by: factionAId,
      });
    } else {
      await base44.entities.Diplomacy.create({
        faction_a_id: factionAId,
        faction_b_id: factionBId,
        status,
        terms,
        previous_status: "neutral",
        initiated_by: factionAId,
      });
    }

    // Broadcast event about diplomacy change
    const statusLabels = {
      neutral: "returned to neutral terms",
      allied: "formed an alliance",
      trade_agreement: "signed a trade agreement",
      ceasefire: "declared a ceasefire",
      hostile: "turned hostile",
      war: "declared war",
    };

    await base44.entities.Event.create({
      title: `${fA?.name} & ${fB?.name}: ${statusLabels[status] || status}`,
      content: terms || `Diplomatic status between ${fA?.name} and ${fB?.name} has changed to ${status}.`,
      type: status === "war" || status === "hostile" ? "faction_conflict" : "broadcast",
      severity: status === "war" ? "critical" : status === "hostile" ? "warning" : "info",
      faction_id: factionAId,
      is_active: true,
    });

    toast({ title: "Diplomacy updated", description: `${fA?.tag} ↔ ${fB?.tag}: ${status.toUpperCase()}` });
    await loadData();
  };

  if (loading) {
    return <div className="text-[10px] text-primary animate-pulse tracking-widest">SCANNING DIPLOMATIC CHANNELS...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Manage inter-faction relationships. Changes are broadcast live and influence mission generation.
        </p>
        <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={loadData}>
          <RefreshCw className="h-3 w-3 mr-1" /> REFRESH
        </Button>
      </div>

      <DiplomacyMatrix factions={factions} relations={relations} />

      <DiplomacyForm factions={factions} getRelation={getRelation} onSubmit={setRelation} />

      <DiplomacyLog relations={relations} factions={factions} />
    </div>
  );
}