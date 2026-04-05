import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Save, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const RESOURCES = ["fuel", "metals", "tech", "food", "munitions"];

export default function FactionEconomyRow({ economy, faction, onSaved }) {
  const [supplyMod, setSupplyMod] = useState(economy.supply_chain_modifier ?? 1);
  const [taxRate, setTaxRate] = useState(economy.tax_rate ?? 0.1);
  const [embargo, setEmbargo] = useState(economy.trade_embargo ?? false);
  const [production, setProduction] = useState(economy.resource_production || {});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.FactionEconomy.update(economy.id, {
      supply_chain_modifier: supplyMod,
      tax_rate: taxRate,
      trade_embargo: embargo,
      resource_production: production,
    });
    toast({ title: `${faction?.name || "Faction"} economy updated` });
    setSaving(false);
    onSaved?.();
  };

  const setProd = (key, val) => {
    setProduction((prev) => ({ ...prev, [key]: Math.max(0, Number(val) || 0) }));
  };

  const totalProd = RESOURCES.reduce((s, r) => s + ((production[r] || 0) * supplyMod), 0);
  const netIncome = totalProd - (economy.wealth || 0) * taxRate;

  return (
    <div className="border border-border rounded-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: faction?.color || "#666" }} />
          <span className="text-sm font-semibold font-display tracking-wider" style={{ color: faction?.color }}>
            {faction?.name || "Unknown"} <span className="text-muted-foreground">[{faction?.tag}]</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] font-mono">
            WEALTH: {Math.round(economy.wealth || 0).toLocaleString()}
          </Badge>
          <Badge variant={netIncome >= 0 ? "default" : "destructive"} className="text-[10px] font-mono flex items-center gap-1">
            {netIncome >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            NET: {netIncome >= 0 ? "+" : ""}{Math.round(netIncome).toLocaleString()}/cycle
          </Badge>
        </div>
      </div>

      {/* Resource Production Inputs */}
      <div>
        <Label className="text-[9px] font-mono tracking-widest text-muted-foreground">BASE PRODUCTION / CYCLE</Label>
        <div className="grid grid-cols-5 gap-2 mt-1">
          {RESOURCES.map((r) => (
            <div key={r}>
              <Label className="text-[9px] font-mono uppercase text-muted-foreground">{r}</Label>
              <Input
                type="number"
                min={0}
                value={production[r] || 0}
                onChange={(e) => setProd(r, e.target.value)}
                className="h-7 text-[11px] font-mono bg-secondary/50 border-border"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Supply Chain Modifier */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[9px] font-mono tracking-widest text-muted-foreground">SUPPLY CHAIN MODIFIER</Label>
            <span className="text-xs font-mono text-primary font-bold">{supplyMod.toFixed(2)}x</span>
          </div>
          <Slider
            value={[supplyMod]}
            onValueChange={([v]) => setSupplyMod(v)}
            min={0.1}
            max={3}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-1">
            <span>0.1x CHOKED</span>
            <span>1.0x NORMAL</span>
            <span>3.0x BOOSTED</span>
          </div>
        </div>

        {/* Tax Rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[9px] font-mono tracking-widest text-muted-foreground">TAX RATE</Label>
            <span className="text-xs font-mono text-accent font-bold">{(taxRate * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[taxRate]}
            onValueChange={([v]) => setTaxRate(v)}
            min={0}
            max={0.5}
            step={0.01}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-1">
            <span>0% NONE</span>
            <span>25%</span>
            <span>50% MAX</span>
          </div>
        </div>
      </div>

      {/* Embargo + Save */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Switch checked={embargo} onCheckedChange={setEmbargo} />
          <Label className="text-[10px] font-mono text-muted-foreground">
            TRADE EMBARGO {embargo && <span className="text-destructive ml-1">● ACTIVE</span>}
          </Label>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="text-[10px] font-mono uppercase tracking-wider">
          <Save className="h-3 w-3 mr-1" />
          {saving ? "SAVING..." : "APPLY CHANGES"}
        </Button>
      </div>
    </div>
  );
}