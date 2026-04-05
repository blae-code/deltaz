import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, TrendingUp, TrendingDown, Minus, Save } from "lucide-react";

const resourceIcons = { fuel: "⛽", munitions: "💣", tech: "⚙️", food: "🍖", medical: "💊" };

export default function FactionEconomyCard({ faction, economy, territoryCount, onUpdate }) {
  const [supplyMod, setSupplyMod] = useState(economy.supply_modifier ?? 1.0);
  const [taxRate, setTaxRate] = useState(economy.tax_rate ?? 0.1);
  const [tradeBalance, setTradeBalance] = useState(economy.trade_balance ?? 0);
  const [upkeep, setUpkeep] = useState(economy.upkeep_cost ?? 100);
  const [saving, setSaving] = useState(false);

  const net = (economy.last_cycle_income || 0) - (economy.last_cycle_expenses || 0);
  const prod = economy.resource_production || {};

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(economy.id, {
      supply_modifier: parseFloat(supplyMod) || 1.0,
      tax_rate: Math.min(1, Math.max(0, parseFloat(taxRate) || 0.1)),
      trade_balance: parseInt(tradeBalance) || 0,
      upkeep_cost: parseInt(upkeep) || 100,
    });
    setSaving(false);
  };

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-secondary/50">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" style={{ color: faction.color }} />
          <span className="text-xs font-bold font-display tracking-wider" style={{ color: faction.color }}>
            {faction.name}
          </span>
          <span className="text-[9px] text-muted-foreground">[{faction.tag}]</span>
        </div>
        <div className="flex items-center gap-1.5">
          {net > 0 && <TrendingUp className="h-3 w-3 text-primary" />}
          {net < 0 && <TrendingDown className="h-3 w-3 text-destructive" />}
          {net === 0 && <Minus className="h-3 w-3 text-muted-foreground" />}
          <span className={`text-[10px] font-semibold ${net > 0 ? "text-primary" : net < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {net >= 0 ? "+" : ""}{net}/cycle
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Wealth & stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="border border-border rounded-sm p-2">
            <div className="text-[9px] text-muted-foreground tracking-wider">WEALTH</div>
            <div className="text-sm font-bold font-display text-primary">{economy.wealth?.toLocaleString()}</div>
          </div>
          <div className="border border-border rounded-sm p-2">
            <div className="text-[9px] text-muted-foreground tracking-wider">INCOME</div>
            <div className="text-sm font-bold font-display text-primary">+{economy.last_cycle_income || 0}</div>
          </div>
          <div className="border border-border rounded-sm p-2">
            <div className="text-[9px] text-muted-foreground tracking-wider">EXPENSES</div>
            <div className="text-sm font-bold font-display text-destructive">-{economy.last_cycle_expenses || 0}</div>
          </div>
        </div>

        {/* Resource production */}
        <div>
          <div className="text-[9px] text-muted-foreground tracking-wider mb-1.5">RESOURCE PRODUCTION</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(prod).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1 bg-secondary/50 border border-border rounded-sm px-2 py-1">
                <span className="text-xs">{resourceIcons[key] || "📦"}</span>
                <span className="text-[10px] text-foreground uppercase">{key}</span>
                <span className="text-[10px] font-semibold text-primary">{val || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modifiers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[9px] tracking-wider">SUPPLY MODIFIER</Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              value={supplyMod}
              onChange={(e) => setSupplyMod(e.target.value)}
              className="h-7 text-[10px] bg-secondary/50 border-border mt-1"
            />
          </div>
          <div>
            <Label className="text-[9px] tracking-wider">TAX RATE</Label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="h-7 text-[10px] bg-secondary/50 border-border mt-1"
            />
          </div>
          <div>
            <Label className="text-[9px] tracking-wider">TRADE BALANCE</Label>
            <Input
              type="number"
              value={tradeBalance}
              onChange={(e) => setTradeBalance(e.target.value)}
              className="h-7 text-[10px] bg-secondary/50 border-border mt-1"
            />
          </div>
          <div>
            <Label className="text-[9px] tracking-wider">UPKEEP COST</Label>
            <Input
              type="number"
              min="0"
              value={upkeep}
              onChange={(e) => setUpkeep(e.target.value)}
              className="h-7 text-[10px] bg-secondary/50 border-border mt-1"
            />
          </div>
        </div>

        {/* Territory count + Save */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-[9px] text-muted-foreground tracking-wider">
            {territoryCount} TERRITOR{territoryCount !== 1 ? "IES" : "Y"} HELD
          </span>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-[10px] uppercase tracking-wider h-7">
            <Save className="h-3 w-3 mr-1" /> {saving ? "..." : "APPLY"}
          </Button>
        </div>
      </div>
    </div>
  );
}