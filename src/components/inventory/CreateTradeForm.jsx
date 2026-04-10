import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Handles both "offer" (I have this) and "want" (I need this) listings.
// The TradeOffer entity uses `type` field to distinguish them.
export default function CreateTradeForm({ items: rawItems, userEmail, userCallsign, onCreated }) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const [mode, setMode] = useState("offer"); // "offer" | "want"

  // Offer mode fields
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [askingPrice, setAskingPrice] = useState(0);
  const [askingItems, setAskingItems] = useState("");

  // Want mode fields
  const [wantItemName, setWantItemName] = useState("");
  const [wantQuantity, setWantQuantity] = useState(1);
  const [canOfferItems, setCanOfferItems] = useState("");
  const [canOfferCredits, setCanOfferCredits] = useState(0);

  const [sector, setSector] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const tradableItems = items.filter(i => i?.name && !i.is_equipped && (i.quantity || 1) > 0);
  const selectedItem = items.find(i => i.id === selectedItemId);

  const submit = async (e) => {
    e.preventDefault();
    if (!sector.trim()) return;
    if (mode === "offer" && !selectedItemId) return;
    if (mode === "want" && !wantItemName.trim()) return;
    setSaving(true);

    if (mode === "offer") {
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
        type: "offer",
      });
      toast({ title: "Trade Posted", description: `${selectedItem?.name} listed for trade` });
    } else {
      await base44.entities.TradeOffer.create({
        seller_email: userEmail,
        seller_callsign: userCallsign,
        item_name: `${wantQuantity > 1 ? `${wantQuantity}x ` : ""}${wantItemName.trim()}`,
        quantity: wantQuantity,
        asking_price: canOfferCredits,
        asking_items: canOfferItems,
        sector: sector.trim().toUpperCase(),
        status: "open",
        type: "want",
      });
      toast({ title: "Want Listed", description: `Seeking ${wantItemName} in sector ${sector.trim().toUpperCase()}` });
    }

    onCreated?.();
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-0">
        <button
          type="button"
          onClick={() => setMode("offer")}
          className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-widest border transition-colors ${
            mode === "offer"
              ? "bg-primary/10 border-primary/40 text-primary"
              : "border-border/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          I'm Offering
        </button>
        <button
          type="button"
          onClick={() => setMode("want")}
          className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-widest border border-l-0 transition-colors ${
            mode === "want"
              ? "bg-accent/10 border-accent/40 text-accent"
              : "border-border/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          I'm Seeking
        </button>
      </div>

      {mode === "offer" ? (
        <>
          <div>
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
              Select Item from Gear Locker
            </Label>
            {tradableItems.length === 0 ? (
              <p className="text-[9px] text-muted-foreground font-mono mt-1 italic">
                No tradable items — add gear to your Loadout first.
              </p>
            ) : (
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
            )}
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
                placeholder="e.g. B-3" required
                className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
              />
            </div>
          </div>

          <div className="panel-frame p-2.5 space-y-2">
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">Asking in return</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[8px] uppercase text-muted-foreground font-mono">Credits</Label>
                <Input type="number" min={0} value={askingPrice} onChange={e => setAskingPrice(parseInt(e.target.value) || 0)} className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
              </div>
              <div>
                <Label className="text-[8px] uppercase text-muted-foreground font-mono">Or Items</Label>
                <Input value={askingItems} onChange={e => setAskingItems(e.target.value)} placeholder="e.g. 5x Ammo" className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
              Item I'm Looking For
            </Label>
            <Input
              value={wantItemName} onChange={e => setWantItemName(e.target.value)}
              placeholder="e.g. Antibiotics, Fuel Can..."
              className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Quantity Needed</Label>
              <Input
                type="number" min={1}
                value={wantQuantity} onChange={e => setWantQuantity(parseInt(e.target.value) || 1)}
                className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Sector</Label>
              <Input
                value={sector} onChange={e => setSector(e.target.value)}
                placeholder="e.g. B-3" required
                className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
              />
            </div>
          </div>

          <div className="panel-frame p-2.5 space-y-2">
            <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">What I can offer in return</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[8px] uppercase text-muted-foreground font-mono">Credits</Label>
                <Input type="number" min={0} value={canOfferCredits} onChange={e => setCanOfferCredits(parseInt(e.target.value) || 0)} className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
              </div>
              <div>
                <Label className="text-[8px] uppercase text-muted-foreground font-mono">Or Items</Label>
                <Input value={canOfferItems} onChange={e => setCanOfferItems(e.target.value)} placeholder="e.g. 10x Scrap" className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
              </div>
            </div>
          </div>
        </>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={saving || (mode === "offer" ? !selectedItemId : !wantItemName.trim()) || !sector.trim()}
        className="w-full font-mono text-[10px] uppercase tracking-wider h-7"
      >
        {mode === "offer"
          ? <ArrowLeftRight className="h-3 w-3 mr-1" />
          : <Search className="h-3 w-3 mr-1" />
        }
        {saving ? "POSTING..." : mode === "offer" ? "POST TRADE OFFER" : "POST WANT LISTING"}
      </Button>
    </form>
  );
}
