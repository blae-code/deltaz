import { Ban, TrendingUp, TrendingDown, Minus, Coins, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RESOURCES = ["fuel", "metals", "tech", "food", "munitions"];
const RESOURCE_ICONS = { fuel: "🛢", metals: "⚙", tech: "💾", food: "🥫", munitions: "🔫" };

export default function FactionSupplyCard({ econ }) {
  const prod = econ.resource_production || {};
  const scm = econ.supply_chain_modifier || 1;
  const totalProduction = RESOURCES.reduce((s, r) => s + Math.round((prod[r] || 0) * scm), 0);

  const scmHealth = scm >= 1.0 ? "OPTIMAL" : scm >= 0.7 ? "DEGRADED" : "CRITICAL";
  const scmColor = scm >= 1.0 ? "text-status-ok" : scm >= 0.7 ? "text-status-warn" : "text-status-danger";

  const incomeChange = (econ.last_cycle_income || 0) - (econ.last_cycle_tax || 0);

  return (
    <div className={`border rounded-sm overflow-hidden ${econ.trade_embargo ? "border-status-danger/40" : "border-border"} bg-card`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-3.5 w-3.5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: econ.faction_color }} />
          <span className="text-[11px] font-mono font-semibold text-foreground truncate">
            {econ.faction_tag} {econ.faction_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {econ.trade_embargo && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 text-status-danger border-status-danger/40 bg-status-danger/10">
              <Ban className="h-2.5 w-2.5 mr-0.5" /> EMBARGO
            </Badge>
          )}
          <Badge variant="outline" className={`text-[7px] px-1 py-0 ${scmColor}`}>
            <Truck className="h-2.5 w-2.5 mr-0.5" /> {scmHealth}
          </Badge>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[8px] text-muted-foreground tracking-widest uppercase font-mono">Wealth</div>
            <div className="text-sm font-bold font-display text-accent">{(econ.wealth || 0).toLocaleString()}c</div>
          </div>
          <div>
            <div className="text-[8px] text-muted-foreground tracking-widest uppercase font-mono">Net Income</div>
            <div className={`text-sm font-bold font-display flex items-center justify-center gap-0.5 ${incomeChange >= 0 ? "text-status-ok" : "text-status-danger"}`}>
              {incomeChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(incomeChange).toLocaleString()}c
            </div>
          </div>
          <div>
            <div className="text-[8px] text-muted-foreground tracking-widest uppercase font-mono">Supply Mod</div>
            <div className={`text-sm font-bold font-display ${scmColor}`}>{scm.toFixed(2)}x</div>
          </div>
        </div>

        {/* Resource production bars */}
        <div className="space-y-1.5">
          {RESOURCES.map(res => {
            const base = prod[res] || 0;
            const effective = Math.round(base * scm);
            const maxVal = Math.max(...RESOURCES.map(r => Math.round((prod[r] || 0) * scm)), 1);
            const pct = Math.round((effective / maxVal) * 100);

            return (
              <div key={res} className="flex items-center gap-2">
                <span className="text-[10px] w-14 shrink-0 font-mono text-muted-foreground">
                  {RESOURCE_ICONS[res]} {res}
                </span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: effective === 0 ? "hsl(0 75% 48%)" : res === "fuel" ? "#d4a13a" : res === "metals" ? "#5ba8c8" : res === "tech" ? "#2dd4a0" : res === "food" ? "#4ade80" : "#c53030",
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-foreground w-8 text-right shrink-0">{effective}</span>
              </div>
            );
          })}
        </div>

        {/* Tax info */}
        <div className="flex items-center justify-between text-[8px] text-muted-foreground font-mono pt-1 border-t border-border/40">
          <span>TAX RATE: {Math.round((econ.tax_rate || 0) * 100)}%</span>
          <span>LAST TAX: {(econ.last_cycle_tax || 0).toLocaleString()}c</span>
          <span>OUTPUT: {totalProduction}/cycle</span>
        </div>
      </div>
    </div>
  );
}