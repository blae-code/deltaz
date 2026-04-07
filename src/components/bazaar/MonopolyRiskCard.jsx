import { Badge } from "@/components/ui/badge";
import { Shield, Lock, AlertOctagon, Link } from "lucide-react";

const TYPE_META = {
  monopoly: { icon: Lock, label: "Monopoly", color: "text-destructive" },
  supply_bottleneck: { icon: Link, label: "Bottleneck", color: "text-status-warn" },
  price_manipulation: { icon: AlertOctagon, label: "Price Manipulation", color: "text-accent" },
  single_point_failure: { icon: Shield, label: "Single Point of Failure", color: "text-chart-4" },
};

const SEVERITY_STYLES = {
  low: "border-border bg-secondary/20",
  medium: "border-accent/20 bg-accent/5",
  high: "border-status-warn/20 bg-status-warn/5",
  critical: "border-destructive/20 bg-destructive/5",
};

export default function MonopolyRiskCard({ risk }) {
  const meta = TYPE_META[risk.type] || TYPE_META.supply_bottleneck;
  const Icon = meta.icon;
  const style = SEVERITY_STYLES[risk.severity] || SEVERITY_STYLES.medium;

  return (
    <div className={`border rounded-sm px-3 py-2.5 ${style}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className={`h-3 w-3 ${meta.color}`} />
          <Badge variant="outline" className={`text-[8px] uppercase ${meta.color}`}>
            {meta.label}
          </Badge>
          <Badge variant="outline" className="text-[8px] uppercase">{risk.severity}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[9px] mb-1.5 flex-wrap">
        {risk.player_or_faction && (
          <span className="font-mono text-foreground font-semibold">{risk.player_or_faction}</span>
        )}
        {risk.resource_affected && (
          <Badge variant="outline" className="text-[8px]">{risk.resource_affected}</Badge>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug mb-1.5">{risk.detail}</p>

      {risk.mitigation && (
        <div className="border-t border-border/50 pt-1.5">
          <p className="text-[9px] text-primary">
            <span className="font-semibold uppercase tracking-wider">Mitigation:</span> {risk.mitigation}
          </p>
        </div>
      )}
    </div>
  );
}