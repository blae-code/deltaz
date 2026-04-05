import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const resourceIcons = {
  fuel: "⛽",
  metals: "⚙",
  tech: "💾",
  food: "🌾",
  munitions: "🔫",
};

const availabilityStyle = {
  scarce: "text-status-danger bg-status-danger/10",
  low: "text-status-warn bg-status-warn/10",
  normal: "text-foreground bg-secondary",
  high: "text-primary bg-primary/10",
  surplus: "text-status-ok bg-status-ok/10",
};

const trendConfig = {
  rising: { icon: TrendingUp, color: "text-status-danger", label: "RISING" },
  stable: { icon: Minus, color: "text-muted-foreground", label: "STABLE" },
  falling: { icon: TrendingDown, color: "text-status-ok", label: "FALLING" },
};

function MiniSparkline({ data }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CommodityRow({ commodity }) {
  const trend = trendConfig[commodity.price_trend] || trendConfig.stable;
  const TrendIcon = trend.icon;
  const priceDelta = commodity.current_price - (commodity.previous_price || commodity.base_price);
  const pctChange = commodity.previous_price ? ((priceDelta / commodity.previous_price) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 border-b border-border/50 hover:bg-secondary/20 transition-colors">
      {/* Resource */}
      <div className="col-span-3 flex items-center gap-2">
        <span className="text-base">{resourceIcons[commodity.resource_type] || "📦"}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {commodity.resource_type}
        </span>
      </div>

      {/* Price */}
      <div className="col-span-2 text-right">
        <span className="text-sm font-bold text-foreground font-mono">{commodity.current_price}</span>
        <span className="text-[9px] text-muted-foreground ml-1">CR</span>
      </div>

      {/* Change */}
      <div className="col-span-2 text-right">
        <span className={`text-[10px] font-mono font-semibold ${priceDelta > 0 ? "text-status-danger" : priceDelta < 0 ? "text-status-ok" : "text-muted-foreground"}`}>
          {priceDelta > 0 ? "+" : ""}{priceDelta.toFixed(1)} ({pctChange}%)
        </span>
      </div>

      {/* Trend */}
      <div className="col-span-1 flex justify-center">
        <TrendIcon className={`h-3.5 w-3.5 ${trend.color}`} />
      </div>

      {/* Availability */}
      <div className="col-span-2 flex justify-center">
        <Badge variant="outline" className={`text-[9px] uppercase ${availabilityStyle[commodity.availability] || ""}`}>
          {commodity.availability}
        </Badge>
      </div>

      {/* Sparkline */}
      <div className="col-span-2 flex justify-end">
        <MiniSparkline data={commodity.price_history} />
      </div>
    </div>
  );
}