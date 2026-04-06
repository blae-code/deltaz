import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowRight, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const RESOURCE_TYPES = ["fuel", "metals", "tech", "food", "munitions"];

export default function FactionContributePanel({ faction, economy, userEmail }) {
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState(1);
  const [contributing, setContributing] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userEmail) {
      base44.entities.InventoryItem.filter({ owner_email: userEmail, category: "material" }, "-created_date", 100)
        .then(setInventory);
    }
  }, [userEmail]);

  const materialItems = inventory.filter(i => (i.quantity || 1) > 0);
  const selected = materialItems.find(i => i.id === selectedItem);

  const handleContribute = async () => {
    if (!selected) return;
    setContributing(true);

    const contributeQty = Math.min(qty, selected.quantity || 1);
    const remaining = (selected.quantity || 1) - contributeQty;

    // Remove from inventory
    if (remaining <= 0) {
      await base44.entities.InventoryItem.delete(selected.id);
    } else {
      await base44.entities.InventoryItem.update(selected.id, { quantity: remaining });
    }

    // Boost faction economy (small wealth increase per contribution)
    const wealthBoost = contributeQty * (selected.value || 5);
    if (economy) {
      await base44.entities.FactionEconomy.update(economy.id, {
        wealth: (economy.wealth || 0) + wealthBoost,
      });
    }

    // Log reputation gain
    await base44.entities.ReputationLog.create({
      player_email: userEmail,
      faction_id: faction.id,
      delta: Math.max(1, Math.round(contributeQty / 2)),
      reason: `Contributed ${contributeQty}x ${selected.name} to ${faction.name}`,
    });

    // Update reputation score
    const reps = await base44.entities.Reputation.filter({ player_email: userEmail, faction_id: faction.id });
    if (reps.length > 0) {
      const bonus = Math.max(1, Math.round(contributeQty / 2));
      const newScore = (reps[0].score || 0) + bonus;
      await base44.entities.Reputation.update(reps[0].id, { score: newScore });
    }

    toast({ title: "Contribution Accepted", description: `${contributeQty}x ${selected.name} donated to ${faction.name}` });
    setDone(true);
    setContributing(false);

    // Refresh inventory
    const inv = await base44.entities.InventoryItem.filter({ owner_email: userEmail, category: "material" }, "-created_date", 100);
    setInventory(inv);
    setSelectedItem("");
    setQty(1);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground">
        Donate materials to strengthen {faction.name}. You'll gain reputation and boost their economy.
      </p>

      {materialItems.length === 0 ? (
        <div className="text-center py-4">
          <Package className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">No materials in your inventory to contribute.</p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono block mb-1">MATERIAL</label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {materialItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} (x{i.quantity || 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected && (selected.quantity || 1) > 1 && (
              <div className="w-20">
                <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono block mb-1">QTY</label>
                <Input
                  type="number"
                  min={1}
                  max={selected.quantity || 1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, Math.min(selected?.quantity || 1, parseInt(e.target.value) || 1)))}
                  className="h-7 text-[10px] bg-secondary/50 border-border font-mono"
                />
              </div>
            )}
            <Button
              size="sm"
              className="h-7 text-[10px] uppercase tracking-wider"
              onClick={handleContribute}
              disabled={!selected || contributing}
            >
              {contributing ? <Loader2 className="h-3 w-3 animate-spin" /> : done ? <Check className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
            </Button>
          </div>

          {selected && (
            <div className="text-[9px] text-muted-foreground font-mono">
              Est. rep gain: +{Math.max(1, Math.round(qty / 2))} · Wealth boost: +{qty * (selected.value || 5)}
            </div>
          )}
        </>
      )}
    </div>
  );
}