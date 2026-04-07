import { Link } from "react-router-dom";
import { Shield, ChevronRight } from "lucide-react";
import AlertSirenSvg from "../svg/AlertSirenSvg";

const THREAT_CONFIG = {
  critical: {
    border: "border-destructive/50",
    bg: "bg-destructive/10",
    text: "text-destructive",
    dot: "bg-destructive",
    heading: "EMERGENCY — COLONY UNDER CRITICAL THREAT",
    cta: "Deploy to Colony",
  },
  high: {
    border: "border-accent/50",
    bg: "bg-accent/10",
    text: "text-accent",
    dot: "bg-accent",
    heading: "ELEVATED THREAT — COLONY ALERT",
    cta: "Review Colony Status",
  },
};

export default function TodayEmergencyBanner({ colony }) {
  if (!colony) return null;

  const threat = colony.threat_level;
  const config = THREAT_CONFIG[threat];
  if (!config) return null;

  const isCritical = threat === "critical";
  const defense = colony.defense_integrity ?? 100;
  const food = colony.food_reserves ?? 100;
  const water = colony.water_supply ?? 100;
  const morale = colony.morale ?? 100;

  return (
    <Link
      to="/colony"
      className={`block border-2 ${config.border} ${config.bg} rounded-sm p-4 transition-colors hover:opacity-90 group`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <AlertSirenSvg size={28} animated={isCritical} className={config.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-2 w-2 rounded-full ${config.dot} ${isCritical ? "animate-pulse" : ""}`} />
            <span className={`text-[11px] font-bold font-mono tracking-widest uppercase ${config.text}`}>
              {config.heading}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {isCritical
              ? "All operatives are urged to report immediately. Colony resources and defenses are under extreme pressure."
              : "Threat levels have increased. Monitor colony vitals and prepare defensive measures."}
          </p>

          {/* Quick vitals summary */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <VitalChip label="Defense" value={defense} threshold={40} />
            <VitalChip label="Food" value={food} threshold={30} />
            <VitalChip label="Water" value={water} threshold={30} />
            <VitalChip label="Morale" value={morale} threshold={25} />
          </div>

          <div className={`flex items-center gap-1 mt-3 text-[10px] font-semibold tracking-wider uppercase ${config.text} group-hover:underline`}>
            <Shield className="h-3 w-3" />
            {config.cta}
            <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function VitalChip({ label, value, threshold }) {
  const isLow = value < threshold;
  return (
    <div className={`text-[9px] font-mono px-2 py-0.5 rounded-sm border ${
      isLow
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-secondary/40 text-muted-foreground"
    }`}>
      {label}: <span className="font-bold">{value}%</span>
    </div>
  );
}