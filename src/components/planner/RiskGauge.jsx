import { Shield, AlertTriangle, Skull, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const tierConfig = {
  low: { label: "LOW RISK", color: "text-status-ok", bg: "bg-status-ok", icon: CheckCircle },
  moderate: { label: "MODERATE", color: "text-status-warn", bg: "bg-status-warn", icon: Shield },
  high: { label: "HIGH RISK", color: "text-status-danger", bg: "bg-status-danger", icon: AlertTriangle },
  critical: { label: "CRITICAL", color: "text-status-danger", bg: "bg-status-danger", icon: Skull },
};

export default function RiskGauge({ assessment, loading }) {
  if (loading) {
    return (
      <div className="border border-border bg-card rounded-sm p-4 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 text-primary animate-spin" />
        <span className="text-[10px] text-muted-foreground font-mono animate-pulse">CALCULATING RISK...</span>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="border border-border bg-card rounded-sm p-4 text-center">
        <Shield className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
        <p className="text-[10px] text-muted-foreground font-mono">
          Select a territory and assign operatives to calculate risk
        </p>
      </div>
    );
  }

  const tier = tierConfig[assessment.risk_tier] || tierConfig.moderate;
  const TierIcon = tier.icon;
  const prob = assessment.success_probability;

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          Risk Assessment
        </h3>
      </div>
      <div className="p-3 space-y-3">
        {/* Big probability display */}
        <div className="text-center py-2">
          <TierIcon className={`h-6 w-6 mx-auto mb-1 ${tier.color}`} />
          <p className={`text-3xl font-bold font-display ${tier.color}`}>{prob}%</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Success Probability</p>
          <Badge variant="outline" className={`text-[8px] ${tier.color} border-current/30 mt-1`}>
            {tier.label}
          </Badge>
        </div>

        {/* Probability bar */}
        <div className="space-y-1">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${tier.bg} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${prob}%` }}
            />
          </div>
          <div className="flex justify-between text-[7px] text-muted-foreground font-mono">
            <span>0%</span>
            <span>SUICIDE</span>
            <span>ROUTINE</span>
            <span>100%</span>
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground tracking-widest uppercase">Factor Breakdown</span>
          {assessment.risk_factors?.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-border/30 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-mono text-foreground">{f.factor}</p>
                <p className="text-[8px] text-muted-foreground truncate">{f.detail}</p>
              </div>
              <span className={`text-[10px] font-bold font-mono shrink-0 ${
                f.impact > 0 ? "text-status-ok" : f.impact < 0 ? "text-status-danger" : "text-muted-foreground"
              }`}>
                {f.impact > 0 ? "+" : ""}{f.impact}%
              </span>
            </div>
          ))}
        </div>

        {/* Squad & territory summary */}
        <div className="grid grid-cols-2 gap-2 text-[9px]">
          <div className="border border-border rounded-sm p-2 bg-secondary/20">
            <p className="text-muted-foreground uppercase text-[7px] tracking-wider mb-0.5">Squad</p>
            <p className="font-mono text-foreground">{assessment.squad_summary?.count} operatives</p>
            <p className="text-muted-foreground">Avg combat: {assessment.squad_summary?.avg_combat}</p>
          </div>
          <div className="border border-border rounded-sm p-2 bg-secondary/20">
            <p className="text-muted-foreground uppercase text-[7px] tracking-wider mb-0.5">Target</p>
            <p className="font-mono text-foreground">{assessment.territory_summary?.name}</p>
            <p className="text-muted-foreground">{assessment.territory_summary?.threat} / {assessment.territory_summary?.status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}