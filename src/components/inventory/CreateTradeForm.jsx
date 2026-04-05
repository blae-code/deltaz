import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CreateTradeForm({ items, userEmail, userCallsign, onCreated }) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [askingPrice, setAskingPrice] = useState(0);
  const [askingItems, setAskingItems] = useState("");
  const [sector, setSector] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const tradableItems = items.filter(i => !i.is_equipped && (i.quantity || 1) > 0);
  const selectedItem = items.find(i => i.id === selectedItemId);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedItemId || !sector.trim()) return;
    setSaving(true);

    await base44.entities.TradeOffer.create({
      seller_email: userEmail,
      seller_callsign: userCallsign,
      item_id: selectedItemId,
      item_name: selectedItem?.name || "Unknown",
      item_category: selectedItem?.category || "misc",
      quantity: Math.min(quantity, selectedItem?.quantity || 1),
      asking_price: askingPrice,
      asking_items: askingItems,
      sector: sector.trim().toUpperCase(),
      status: "open",
    });

    toast({ title: "Trade Posted", description: `${selectedItem?.name} listed for trade` });
    onCreated?.();
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Select Item</Label>
        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
          <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5">
            <SelectValue placeholder="Choose item to trade..." />
          </SelectTrigger>
          <SelectContent>
            {tradableItems.map(i => (
              <SelectItem key={i.id} value={i.id}>
                {i.name} ({i.rarity}) x{i.quantity || 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Quantity</Label>
          <Input
            type="number" min={1} max={selectedItem?.quantity || 1}
            value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
            className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
          />
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Sector</Label>
          <Input
            value={sector} onChange={e => setSector(e.target.value)}
            placeholder="e.g. B-3"
            required
            className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Asking Price (c)</Label>
          <Input type="number" min={0} value={askingPrice} onChange={e => setAskingPrice(parseInt(e.target.value) || 0)} className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5" />
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Or Want Items</Label>
          <Input value={askingItems} onChange={e => setAskingItems(e.target.value)} placeholder="e.g. 5x Ammo" className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5" />
        </div>
      </div>

      <Button type="submit" size="sm" disabled={saving || !selectedItemId} className="w-full font-mono text-[10px] uppercase tracking-wider h-7">
        <ArrowLeftRight className="h-3 w-3 mr-1" /> {saving ? "POSTING..." : "POST TRADE OFFER"}
      </Button>
    </form>
  );
}