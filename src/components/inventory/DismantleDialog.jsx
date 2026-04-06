import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hammer, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DismantleDialog({ item, userEmail, onComplete, onCancel }) {
  const [dismantling, setDismantling] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const estimatedMaterials = [];
  const val = item.value || 10;
  if (item.category === "weapon") estimatedMaterials.push({ name: "Scrap Metal", qty: Math.ceil(val / 15) }, { name: "Mechanical Parts", qty: Math.ceil(val / 25) });
  else if (item.category === "armor") estimatedMaterials.push({ name: "Scrap Metal", qty: Math.ceil(val / 10) }, { name: "Cloth", qty: Math.ceil(val / 20) });
  else if (item.category === "tool") estimatedMaterials.push({ name: "Scrap Metal", qty: Math.ceil(val / 12) }, { name: "Mechanical Parts", qty: Math.ceil(val / 30) });
  else estimatedMaterials.push({ name: "Salvage", qty: Math.max(1, Math.ceil(val / 20)) });

  // Condition affects yield
  const condMod = (item.condition ?? 100) / 100;

  const handleDismantle = async () => {
    setDismantling(true);
    const yielded = estimatedMaterials.map(m => ({
      ...m,
      qty: Math.max(1, Math.round(m.qty * condMod)),
    }));

    // Create materials in inventory
    for (const mat of yielded) {
      await base44.entities.InventoryItem.create({
        owner_email: userEmail,
        name: mat.name,
        category: "material",
        quantity: mat.qty,
        rarity: "common",
        value: Math.round(val / yielded.length / mat.qty),
        source: `Dismantled: ${item.name}`,
      });
    }

    // Remove original item
    await base44.entities.InventoryItem.delete(item.id);

    setResult(yielded);
    toast({ title: "Item Dismantled", description: `${item.name} broken down into ${yielded.length} materials` });
    setDismantling(false);
    setTimeout(() => onComplete?.(), 1500);
  };

  return (
    <div className="border border-accent/30 bg-accent/5 rounded-sm p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Hammer className="h-4 w-4 text-accent" />
        <span className="text-xs font-semibold font-display tracking-wider text-accent uppercase">
          Dismantle: {item.name}
        </span>
      </div>

      {!result ? (
        <>
          <div className="text-[10px] text-muted-foreground">
            Breaking down this item will destroy it and yield raw materials.
            Condition affects yield ({Math.round(condMod * 100)}% efficiency).
          </div>

          <div className="text-[9px] text-muted-foreground tracking-widest uppercase mb-1">ESTIMATED YIELD</div>
          <div className="flex gap-1.5 flex-wrap">
            {estimatedMaterials.map((m, i) => (
              <Badge key={i} variant="outline" className="text-[9px]">
                ~{Math.max(1, Math.round(m.qty * condMod))}x {m.name}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[9px] text-status-warn">
            <AlertTriangle className="h-3 w-3" />
            <span>This action is irreversible.</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase tracking-wider" onClick={onCancel}>
              CANCEL
            </Button>
            <Button
              size="sm"
              className="h-7 text-[10px] uppercase tracking-wider bg-accent text-accent-foreground hover:bg-accent/80"
              onClick={handleDismantle}
              disabled={dismantling}
            >
              {dismantling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Hammer className="h-3 w-3 mr-1" />}
              DISMANTLE
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <div className="text-[10px] text-status-ok font-mono">✓ DISMANTLED SUCCESSFULLY</div>
          <div className="flex gap-1.5 flex-wrap">
            {result.map((m, i) => (
              <Badge key={i} variant="outline" className="text-[9px] border-status-ok/30 text-status-ok">
                +{m.qty}x {m.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}