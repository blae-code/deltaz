import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import useGameCatalog from "@/hooks/useGameCatalog";
import { buildInventoryRecordFromCatalog, matchGameItemByName } from "@/lib/gameCatalog";

const CATEGORIES = ["weapon", "armor", "tool", "consumable", "material", "ammo", "misc"];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

export default function AddItemForm({ userEmail, onAdded }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("misc");
  const [rarity, setRarity] = useState("common");
  const [quantity, setQuantity] = useState(1);
  const [value, setValue] = useState(0);
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: gameItems = [] } = useGameCatalog();

  const matchedCatalogItem = matchGameItemByName(gameItems, name);

  const applyCatalogDefaults = (value) => {
    const matched = matchGameItemByName(gameItems, value);
    if (!matched) {
      return;
    }

    const defaults = buildInventoryRecordFromCatalog(matched);
    setName(matched.name);
    setCategory(defaults.category);
    setRarity(defaults.rarity);
    setValue(defaults.value);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const canonical = matchedCatalogItem ? buildInventoryRecordFromCatalog(matchedCatalogItem) : null;
    await base44.entities.InventoryItem.create({
      owner_email: userEmail,
      name: canonical?.name || name.trim(),
      game_item_slug: canonical?.game_item_slug || "",
      category: canonical?.category || category,
      rarity: canonical?.rarity || rarity,
      quantity: Math.max(1, quantity),
      value: canonical?.value ?? value,
      source: source || (matchedCatalogItem ? "catalog entry" : "manual entry"),
      condition: 100,
    });
    toast({ title: "Item Added", description: canonical?.name || name });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    onAdded?.();
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Name</Label>
          <Input
            value={name}
            onChange={e => {
              const nextValue = e.target.value;
              setName(nextValue);
              applyCatalogDefaults(nextValue);
            }}
            list="game-item-catalog"
            required
            className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
          />
          <datalist id="game-item-catalog">
            {gameItems.map((item) => (
              <option key={item.id || item.slug} value={item.name} />
            ))}
          </datalist>
          {matchedCatalogItem && (
            <div className="mt-1 text-[9px] font-mono text-primary/80">
              CATALOG MATCH • {(matchedCatalogItem.category || "misc").toUpperCase()}
              {matchedCatalogItem.subcategory ? ` • ${matchedCatalogItem.subcategory.toUpperCase()}` : ""}
              {matchedCatalogItem.weight != null ? ` • ${matchedCatalogItem.weight} KG` : ""}
            </div>
          )}
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Rarity</Label>
          <Select value={rarity} onValueChange={setRarity}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>{RARITIES.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Quantity</Label>
          <Input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5" />
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Value (c)</Label>
          <Input type="number" min={0} value={value} onChange={e => setValue(parseInt(e.target.value) || 0)} className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5" />
        </div>
      </div>
      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Source</Label>
        <Input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Scavenge Run, Crafted, Trade" className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5" />
      </div>
      <Button type="submit" size="sm" disabled={saving} className="w-full font-mono text-[10px] uppercase tracking-wider h-7">
        <Plus className="h-3 w-3 mr-1" /> {saving ? "ADDING..." : "ADD TO INVENTORY"}
      </Button>
    </form>
  );
}
