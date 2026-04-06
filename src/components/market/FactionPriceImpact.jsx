import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, TrendingDown, Ban } from "lucide-react";

export default function FactionPriceImpact({ economies, factions, commodities }) {
  if (!economies || economies.length === 0 || !factions || factions.length === 0) return null;

  // Show how each faction's economy is affecting prices
  const factionData = factions.map(f => {
    const econ = economies.find(e => e.faction_id === f.id);
    if (!econ) return null;

    const production = econ.resource_production || {};
    const topResource = Object.entries(production).sort((a, b) => b[1] - a[1])[0];
    const modifier = econ.supply_chain_modifier || 1;

    return {
      faction: f,
      economy: econ,
      topResource: topResource ? topResource[0] : null,
      topOutput: topResource ? topResource[1] : 0,
      modifier,
      isEmbargoed: econ.trade_embargo,
    };
  }).filter(Boolean);

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/30">
        <span className="text-[10px] font-semibold font-display tracking-wider text-primary uppercase">
          Faction Economic Impact
        </span>
      </div>
      <div className="p-2 space-y-1.5">
        {factionData.map(fd => (
          <div key={fd.faction.id} className="flex items-center gap-2 bg-secondary/20 rounded-sm px-2 py-1.5">
            <div className="h-5 w-5 rounded-sm border flex items-center justify-center shrink-0"
              style={{ borderColor: fd.faction.color || 'hsl(var(--border))', backgroundColor: `${fd.faction.color}15` || 'transparent' }}>
              <Shield className="h-3 w-3" style={{ color: fd.faction.color || 'hsl(var(--muted-foreground))' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-semibold text-foreground truncate">
                  [{fd.faction.tag}] {fd.faction.name}
                </span>
                {fd.isEmbargoed && (
                  <Badge variant="outline" className="text-[7px] text-status-danger border-status-danger/30">
                    <Ban className="h-2 w-2 mr-0.5" /> EMBARGO
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[8px] text-muted-foreground mt-0.5">
                {fd.topResource && (
                  <span>Top: <span className="text-foreground uppercase">{fd.topResource}</span> ({fd.topOutput}/cycle)</span>
                )}
                <span>Supply ×{fd.modifier.toFixed(1)}</span>
                <span>Wealth: <span className="text-primary">{(fd.economy.wealth || 0).toLocaleString()}c</span></span>
              </div>
            </div>
            <div className="shrink-0">
              {fd.modifier > 1.2 ? (
                <TrendingDown className="h-3 w-3 text-status-ok" title="High supply = lower prices" />
              ) : fd.modifier < 0.8 ? (
                <TrendingUp className="h-3 w-3 text-status-danger" title="Low supply = higher prices" />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}