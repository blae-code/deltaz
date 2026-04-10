import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import useGameCatalog from "@/hooks/useGameCatalog";
import { buildTradeLineItemFromInventory } from "@/lib/gameCatalog";
import TradeLineItemsEditor from "@/components/trading/TradeLineItemsEditor";

export default function CreateTradeForm({ items: rawItems, onCreated }) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const [mode, setMode] = useState("offer");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [requestedItems, setRequestedItems] = useState([]);
  const [requestedCredits, setRequestedCredits] = useState(0);
  const [wantItems, setWantItems] = useState([]);
  const [canOfferItems, setCanOfferItems] = useState([]);
  const [canOfferCredits, setCanOfferCredits] = useState(0);
  const [sector, setSector] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { data: gameItems = [] } = useGameCatalog();

  const tradableItems = useMemo(
    () => items.filter((item) => item?.name && !item.is_equipped && (item.quantity || 1) > 0),
    [items],
  );
  const selectedItem = useMemo(
    () => tradableItems.find((item) => item.id === selectedItemId) || null,
    [tradableItems, selectedItemId],
  );

  const submit = async (event) => {
    event.preventDefault();
    if (!sector.trim()) {
      return;
    }

    setSaving(true);
    try {
      if (mode === "offer") {
        if (!selectedItem) {
          return;
        }

        await base44.functions.invoke("tradeOps", {
          action: "create_listing",
          listing_type: "offer",
          sector: sector.trim().toUpperCase(),
          offered_items: [buildTradeLineItemFromInventory(selectedItem, quantity, gameItems)],
          requested_items: requestedItems,
          requested_credits: requestedCredits,
        });
        toast({ title: "Trade Posted", description: `${selectedItem.name} listed for trade` });
      } else {
        await base44.functions.invoke("tradeOps", {
          action: "create_listing",
          listing_type: "want",
          sector: sector.trim().toUpperCase(),
          requested_items: wantItems,
          offered_items: canOfferItems,
          offered_credits: canOfferCredits,
        });
        toast({ title: "Want Listed", description: `Want listing posted for ${sector.trim().toUpperCase()}` });
      }

      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  const isValid = mode === "offer"
    ? Boolean(selectedItem && sector.trim())
    : wantItems.length > 0 && sector.trim();

  return (
    <form onSubmit={submit} className="space-y-3">
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
          I&apos;m Offering
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
          I&apos;m Seeking
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
                No tradable items available in your locker.
              </p>
            ) : (
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5">
                  <SelectValue placeholder="Choose item to trade..." />
                </SelectTrigger>
                <SelectContent>
                  {tradableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} x{item.quantity || 1}
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
                type="number"
                min={1}
                max={selectedItem?.quantity || 1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, parseInt(event.target.value, 10) || 1))}
                className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Sector</Label>
              <Input
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                placeholder="e.g. B-3"
                required
                className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
              />
            </div>
          </div>

          <div className="panel-frame p-2.5 space-y-3">
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">Asking in return</div>
            <TradeLineItemsEditor
              label="Requested Items"
              catalog={gameItems}
              value={requestedItems}
              onChange={setRequestedItems}
              emptyLabel="Credits only or open barter."
            />
            <div>
              <Label className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Requested Credits</Label>
              <Input
                type="number"
                min={0}
                value={requestedCredits}
                onChange={(event) => setRequestedCredits(Math.max(0, parseInt(event.target.value, 10) || 0))}
                className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <TradeLineItemsEditor
            label="Requested Items"
            catalog={gameItems}
            value={wantItems}
            onChange={setWantItems}
            emptyLabel="Add at least one catalog item you are seeking."
          />

          <div>
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Sector</Label>
            <Input
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              placeholder="e.g. B-3"
              required
              className="h-7 text-xs bg-secondary/50 border-border font-mono mt-0.5"
            />
          </div>

          <div className="panel-frame p-2.5 space-y-3">
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">What I can offer in return</div>
            <TradeLineItemsEditor
              label="Offered Items"
              catalog={gameItems}
              inventory={tradableItems}
              allowInventory
              value={canOfferItems}
              onChange={setCanOfferItems}
              emptyLabel="Optional barter items."
            />
            <div>
              <Label className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Offered Credits</Label>
              <Input
                type="number"
                min={0}
                value={canOfferCredits}
                onChange={(event) => setCanOfferCredits(Math.max(0, parseInt(event.target.value, 10) || 0))}
                className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
              />
            </div>
          </div>
        </>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={saving || !isValid}
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
