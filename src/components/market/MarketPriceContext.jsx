import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Fuel, Cpu, Utensils, Wrench, Crosshair } from "lucide-react";

const resourceIcons = {
  fuel: Fuel,
  metals: Wrench,
  tech: Cpu,
  food: Utensils,
  munitions: Crosshair,
};

export default function MarketPriceContext({ commodities, economies }) {
  if (!commodities || commodities.length === 0) return null;

  // Find commodities with biggest changes
  const withChange = commodities.map(c => ({
    ...c,
    pctChange: c.previous_price > 0 ? ((c.current_price - c.previous_price) / c.previous_price) * 100 : 0,
  })).sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

  // Calculate faction economic health
  const totalWealth = economies.reduce((s, e) => s + (e.wealth || 0), 0);
  const embargoCount = economies.filter(e => e.trade_embargo).length;

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/30">
        <span className="text-[10px] font-semibold font-display tracking-wider text-primary uppercase">
          Market Pulse
        </span>
      </div>
      <div className="p-3 space-y-3">
        {/* Price ticker */}
        <div className="flex flex-wrap gap-2">
          {withChange.slice(0, 5).map(c => {
            const Icon = resourceIcons[c.resource_type] || Fuel;
            const isUp = c.pctChange > 1;
            const isDown = c.pctChange < -1;
            return (
              <div key={c.id} className="flex items-center gap-1.5 bg-secondary/30 rounded-sm px-2 py-1">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-mono text-foreground uppercase">{c.resource_type}</span>
                <span className="text-[10px] font-mono font-bold text-primary">{c.current_price}c</span>
                {isUp && <TrendingUp className="h-3 w-3 text-status-danger" />}
                {isDown && <TrendingDown className="h-3 w-3 text-status-ok" />}
                {!isUp && !isDown && <Minus className="h-3 w-3 text-muted-foreground" />}
                <span className={`text-[9px] font-mono ${isUp ? "text-status-danger" : isDown ? "text-status-ok" : "text-muted-foreground"}`}>
                  {c.pctChange > 0 ? "+" : ""}{c.pctChange.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Economy indicators */}
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground font-mono">
          <span>TOTAL FACTION WEALTH: <span className="text-primary">{totalWealth.toLocaleString()}c</span></span>
          {embargoCount > 0 && (
            <Badge variant="outline" className="text-[8px] text-status-danger border-status-danger/30">
              {embargoCount} EMBARGO{embargoCount > 1 ? "S" : ""} ACTIVE
            </Badge>
          )}
          <span className="text-muted-foreground/50">·</span>
          <span>{commodities.filter(c => c.availability === "scarce").length} SCARCE RESOURCES</span>
        </div>
      </div>
    </div>
  );
}