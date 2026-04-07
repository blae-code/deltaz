import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const RESOURCES = [
  { value: "food", label: "Food" },
  { value: "water", label: "Water" },
  { value: "medical", label: "Medical Supplies" },
  { value: "power", label: "Power Cells" },
  { value: "defense_parts", label: "Defense Parts" },
  { value: "scrap", label: "Scrap" },
];

const REQUESTED_RESOURCES = [
  ...RESOURCES,
  { value: "credits", label: "Credits" },
];

export default function CreateTradeListingForm({ userEmail, userBases, onCreated }) {
  const [offered, setOffered] = useState("food");
  const [qtyOffered, setQtyOffered] = useState(10);
  const [requested, setRequested] = useState("water");
  const [qtyRequested, setQtyRequested] = useState(10);
  const [baseId, setBaseId] = useState(userBases[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (offered === requested) {
      toast({ title: "Cannot trade same resource", variant: "destructive" });
      return;
    }
    if (qtyOffered <= 0 || qtyRequested <= 0) {
      toast({ title: "Quantities must be positive", variant: "destructive" });
      return;
    }

    const base = userBases.find(b => b.id === baseId);
    setSubmitting(true);
    await base44.entities.ResourceTrade.create({
      seller_email: userEmail,
      seller_base_id: baseId,
      seller_base_name: base?.name || "Unknown",
      seller_type: "player",
      resource_offered: offered,
      quantity_offered: Number(qtyOffered),
      resource_requested: requested,
      quantity_requested: Number(qtyRequested),
      status: "open",
      notes: notes.trim() || undefined,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    toast({ title: "Trade listing posted" });
    setSubmitting(false);
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Base selector */}
      {userBases.length > 1 && (
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Trading From</label>
          <Select value={baseId} onValueChange={setBaseId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {userBases.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Offering */}
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">Offering</label>
          <Select value={offered} onValueChange={setOffered}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESOURCES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={100}
            value={qtyOffered}
            onChange={e => setQtyOffered(e.target.value)}
            className="h-8 text-xs"
            placeholder="Qty"
          />
        </div>

        {/* Requesting */}
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">Requesting</label>
          <Select value={requested} onValueChange={setRequested}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REQUESTED_RESOURCES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={100}
            value={qtyRequested}
            onChange={e => setQtyRequested(e.target.value)}
            className="h-8 text-xs"
            placeholder="Qty"
          />
        </div>
      </div>

      <Input
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Optional trade notes..."
        className="h-8 text-xs"
        maxLength={200}
      />

      <Button type="submit" disabled={submitting} className="w-full text-[10px] uppercase tracking-wider h-8">
        {submitting ? "Posting..." : "Post Trade Listing"}
      </Button>
    </form>
  );
}