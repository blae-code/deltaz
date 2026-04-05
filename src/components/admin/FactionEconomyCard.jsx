import { useState } from "react";
import { Shield, TrendingUp, TrendingDown, Minus, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function FactionEconomyCard({ economy, faction, territoryCount, resources, onUpdate }) {
  const [taxRate, setTaxRate] = useState(economy.tax_rate);
  const [supplyMod, setSupplyMod] = useState(economy.supply_modifier);
  const [sanctions, setSanctions] = useState(economy.sanctions_active);
  const [saving, setSaving] = useState(false);

  const effectiveProduction = Math.round(economy.production_rate * supplyMod * territoryCount * (sanctions ? 0.5 : 1));
  const taxRevenue = Math.round(effectiveProduction * (taxRate / 100));
  const netIncome = effectiveProduction - taxRevenue + economy.trade_balance;

  const hasChanges = taxRate !== economy.tax_rate || supplyMod !== economy.supply_modifier || sanctions !== economy.sanctions_active;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ tax_rate: taxRate, supply_modifier: supplyMod, sanctions_active: sanctions });
    setSaving(false);
  };

  const resourceList = Object.entries(resources);

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-secondary/30">
        <div className="flex items-center gap-2.5">
          <Shield className="h-4 w-4" style={{ color: faction.color }} />
          <span className="text-xs font-bold font-display tracking-wider" style={{ color: faction.color }}>{faction.name}</span>
          <Badge variant="outline" className="text-[9px]">{faction.tag}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[9px] text-muted-foreground tracking-wider">WEALTH</div>
            <div className="text-sm font-bold font-display text-primary">{economy.wealth.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "TERRITORIES", value: territoryCount },
            { label: "BASE PROD", value: economy.production_rate },
            { label: "EFF. PROD", value: effectiveProduction, color: effectiveProduction > economy.production_rate ? "text-primary" : effectiveProduction < economy.production_rate ? "text-destructive" : "" },
            { label: "NET INCOME", value: netIncome, color: netIncome > 0 ? "text-primary" : netIncome < 0 ? "text-destructive" : "", icon: netIncome > 0 ? TrendingUp : netIncome < 0 ? TrendingDown : Minus },
          ].map((s) => (
            <div key={s.label} className="border border-border rounded-sm p-2 text-center">
              <div className="text-[8px] text-muted-foreground tracking-wider">{s.label}</div>
              <div className={`text-sm font-bold font-display ${s.color || "text-foreground"}`}>
                {s.icon && <s.icon className="h-3 w-3 inline mr-0.5" />}
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Resources */}
        {resourceList.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground tracking-wider">RESOURCES:</span>
            {resourceList.map(([name, count]) => (
              <Badge key={name} variant="secondary" className="text-[9px]">{name} x{count}</Badge>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4">
          {/* Tax Rate */}
          <div className="space-y-1.5">
            <Label className="text-[9px] font-mono tracking-wider">TAX RATE: {taxRate}%</Label>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full h-1.5 accent-primary bg-muted rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground">
              <span>0%</span><span>50%</span>
            </div>
          </div>

          {/* Supply Modifier */}
          <div className="space-y-1.5">
            <Label className="text-[9px] font-mono tracking-wider">SUPPLY MOD: {supplyMod.toFixed(1)}x</Label>
            <input
              type="range"
              min={0.1}
              max={3.0}
              step={0.1}
              value={supplyMod}
              onChange={(e) => setSupplyMod(Number(e.target.value))}
              className="w-full h-1.5 accent-primary bg-muted rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground">
              <span>0.1x</span><span>3.0x</span>
            </div>
          </div>
        </div>

        {/* Sanctions toggle + Save */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Switch checked={sanctions} onCheckedChange={setSanctions} />
            <div className="flex items-center gap-1">
              <Ban className={`h-3 w-3 ${sanctions ? "text-destructive" : "text-muted-foreground"}`} />
              <span className={`text-[10px] tracking-wider ${sanctions ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                TRADE SANCTIONS
              </span>
            </div>
          </div>
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving} className="text-[10px] uppercase tracking-wider h-7">
              {saving ? "SAVING..." : "APPLY CHANGES"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}