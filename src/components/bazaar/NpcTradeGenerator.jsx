import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Shield, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const NPC_TRADES = [
  { offered: "food", qty_o: 15, requested: "scrap", qty_r: 10, faction: "Agri-Corp Remnant" },
  { offered: "water", qty_o: 20, requested: "credits", qty_r: 30, faction: "Hydro Guild" },
  { offered: "medical", qty_o: 8, requested: "food", qty_r: 12, faction: "Red Cross Holdouts" },
  { offered: "defense_parts", qty_o: 5, requested: "power", qty_r: 10, faction: "Iron Wall Syndicate" },
  { offered: "power", qty_o: 12, requested: "scrap", qty_r: 15, faction: "Volt Runners" },
  { offered: "scrap", qty_o: 25, requested: "water", qty_r: 10, faction: "Scavenger Union" },
];

export default function NpcTradeGenerator({ factions, onGenerated }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    // Pick 2-3 random NPC trades
    const shuffled = [...NPC_TRADES].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));

    for (const pick of picks) {
      const matchingFaction = factions.find(f => f.status === "active");
      await base44.entities.ResourceTrade.create({
        seller_email: "npc@system",
        seller_type: "npc_faction",
        npc_faction_id: matchingFaction?.id || "",
        npc_faction_name: pick.faction,
        seller_base_name: pick.faction,
        resource_offered: pick.offered,
        quantity_offered: pick.qty_o + Math.floor(Math.random() * 10),
        resource_requested: pick.requested,
        quantity_requested: pick.qty_r + Math.floor(Math.random() * 5),
        status: "open",
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    toast({ title: `${picks.length} NPC trade offers generated` });
    setGenerating(false);
    onGenerated?.();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-[10px] uppercase tracking-wider h-8 gap-1.5"
      onClick={handleGenerate}
      disabled={generating}
    >
      <Shield className="h-3 w-3" />
      {generating ? "Generating..." : "Generate NPC Trades"}
    </Button>
  );
}