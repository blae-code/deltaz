import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const RESOURCES = ["fuel", "metals", "tech", "food", "munitions"];

export default function TradeRouteForm({ factions, economies, onCreated }) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [resource, setResource] = useState("fuel");
  const [amount, setAmount] = useState(5);
  const [price, setPrice] = useState(10);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fromFaction = factions.find(f => f.id === fromId);
  const toFaction = factions.find(f => f.id === toId);
  const fromEco = economies.find(e => e.faction_id === fromId);
  const toEco = economies.find(e => e.faction_id === toId);

  const handleCreate = async () => {
    if (!fromId || !toId || fromId === toId) return;
    setCreating(true);
    await base44.entities.TradeRoute.create({
      from_faction_id: fromId,
      to_faction_id: toId,
      resource_type: resource,
      amount,
      price_per_unit: price,
      status: "active",
    });
    toast({ title: "Trade route established" });
    setFromId("");
    setToId("");
    setAmount(5);
    setCreating(false);
    onCreated?.();
  };

  const cycleCost = amount * price;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] font-mono tracking-widest text-muted-foreground">EXPORTING CLAN</Label>
          <Select value={fromId} onValueChange={setFromId}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted mt-1"><SelectValue placeholder="Select clan..." /></SelectTrigger>
            <SelectContent>
              {factions.filter(f => f.status === "active").map(f => {
                const eco = economies.find(e => e.faction_id === f.id);
                return (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                      {f.name} [{f.tag}]
                      {eco?.trade_embargo && <Badge variant="destructive" className="text-[8px]">EMBARGO</Badge>}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] font-mono tracking-widest text-muted-foreground">IMPORTING CLAN</Label>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted mt-1"><SelectValue placeholder="Select clan..." /></SelectTrigger>
            <SelectContent>
              {factions.filter(f => f.status === "active" && f.id !== fromId).map(f => {
                const eco = economies.find(e => e.faction_id === f.id);
                return (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                      {f.name} [{f.tag}]
                      {eco?.trade_embargo && <Badge variant="destructive" className="text-[8px]">EMBARGO</Badge>}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-[9px] font-mono tracking-widest text-muted-foreground">RESOURCE</Label>
          <Select value={resource} onValueChange={setResource}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESOURCES.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] font-mono tracking-widest text-muted-foreground">UNITS/CYCLE</Label>
          <Input type="number" min={1} value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} className="h-8 font-mono text-xs bg-muted mt-1" />
        </div>
        <div>
          <Label className="text-[9px] font-mono tracking-widest text-muted-foreground">PRICE/UNIT</Label>
          <Input type="number" min={1} value={price} onChange={e => setPrice(Number(e.target.value) || 0)} className="h-8 font-mono text-xs bg-muted mt-1" />
        </div>
      </div>

      {/* Preview */}
      {fromFaction && toFaction && (
        <div className="border border-primary/20 bg-primary/5 rounded-sm p-3">
          <div className="flex items-center justify-center gap-3 text-xs mb-2">
            <span className="font-semibold" style={{ color: fromFaction.color }}>{fromFaction.tag}</span>
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold" style={{ color: toFaction.color }}>{toFaction.tag}</span>
          </div>
          <div className="text-center text-[10px] text-muted-foreground">
            {amount} {resource.toUpperCase()} per cycle @ {price} credits/unit = <span className="text-primary font-bold">{cycleCost} credits/cycle</span>
          </div>
          {fromEco?.trade_embargo && <p className="text-[10px] text-destructive text-center mt-1">⚠ EXPORTER UNDER EMBARGO</p>}
          {toEco?.trade_embargo && <p className="text-[10px] text-destructive text-center mt-1">⚠ IMPORTER UNDER EMBARGO</p>}
        </div>
      )}

      <Button onClick={handleCreate} disabled={!fromId || !toId || fromId === toId || creating} className="w-full font-mono text-xs uppercase tracking-wider">
        <Plus className="h-3.5 w-3.5 mr-2" />
        {creating ? "ESTABLISHING ROUTE..." : "ESTABLISH TRADE ROUTE"}
      </Button>
    </div>
  );
}