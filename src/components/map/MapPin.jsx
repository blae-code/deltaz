import { cn } from "@/lib/utils";
import { MapPin as MapPinIcon, Crosshair, AlertTriangle, Package, Home, Star } from "lucide-react";

const typeConfig = {
  poi: { icon: Star, color: "text-chart-4", bg: "bg-chart-4/20" },
  danger: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/20" },
  loot: { icon: Package, color: "text-accent", bg: "bg-accent/20" },
  base: { icon: Home, color: "text-primary", bg: "bg-primary/20" },
  mission: { icon: Crosshair, color: "text-accent", bg: "bg-accent/20" },
  custom: { icon: MapPinIcon, color: "text-foreground", bg: "bg-muted" },
  territory: { icon: MapPinIcon, color: "text-primary", bg: "bg-primary/20" },
};

export default function MapMarkerPin({ x, y, label, type = "custom", color, isSelected, onClick, size = "md" }) {
  const config = typeConfig[type] || typeConfig.custom;
  const Icon = config.icon;
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <button
      className={cn(
        "absolute z-10 flex items-center justify-center rounded-full border transition-all duration-150 hover:scale-125 hover:z-30",
        isSelected ? "scale-125 z-30 ring-2 ring-primary/50" : "",
        sizeClass,
        config.bg,
        "border-current"
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        color: color || undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={label}
    >
      <Icon className={cn(iconSize, color ? "" : config.color)} style={color ? { color } : undefined} />
    </button>
  );
}