import DataCard from "../terminal/DataCard";
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";

function scoreFaction(econ, territories) {
  let score = 0;
  let reasons = [];

  // Trade embargo = critical
  if (econ.trade_embargo) { score += 40; reasons.push("EMBARGO ACTIVE"); }

  // Low supply chain
  const scm = econ.supply_chain_modifier || 1;
  if (scm < 0.5) { score += 30; reasons.push(`Supply chain critical (${scm}x)`); }
  else if (scm < 0.8) { score += 15; reasons.push(`Supply chain degraded (${scm}x)`); }

  // Low wealth
  if ((econ.wealth || 0) < 200) { score += 20; reasons.push(`Low wealth (${econ.wealth}c)`); }

  // High tax bleeding
  if ((econ.tax_rate || 0) > 0.3) { score += 10; reasons.push(`High tax rate (${Math.round(econ.tax_rate * 100)}%)`); }

  // Negative last cycle income
  if ((econ.last_cycle_income || 0) <= 0) { score += 15; reasons.push("No income last cycle"); }

  // Count hostile territories for this faction
  const factionTerrs = territories.filter(t => t.controlling_faction_id === econ.faction_id);
  const hostileCount = factionTerrs.filter(t => t.status === "hostile" || t.status === "contested").length;
  if (hostileCount > 0) { score += hostileCount * 8; reasons.push(`${hostileCount} contested/hostile zone(s)`); }

  // Zero production in any resource
  const prod = econ.resource_production || {};
  const zeroResources = ["fuel", "metals", "tech", "food", "munitions"].filter(r => (prod[r] || 0) === 0);
  if (zeroResources.length > 0) { score += zeroResources.length * 5; reasons.push(`No production: ${zeroResources.join(", ")}`); }

  return { score, reasons };
}

function priorityLabel(score) {
  if (score >= 50) return { label: "CRITICAL", color: "text-status-danger", bg: "bg-status-danger/10 border-status-danger/30" };
  if (score >= 25) return { label: "HIGH", color: "text-status-warn", bg: "bg-status-warn/10 border-status-warn/30" };
  if (score >= 10) return { label: "MODERATE", color: "text-accent", bg: "bg-accent/10 border-accent/30" };
  return { label: "STABLE", color: "text-status-ok", bg: "bg-status-ok/5 border-status-ok/20" };
}

export default function PriorityMatrix({ economies, territories }) {
  const scored = economies.map(e => ({
    ...e,
    ...scoreFaction(e, territories),
  })).sort((a, b) => b.score - a.score);

  return (
    <DataCard title="Support Priority Matrix">
      <p className="text-[9px] text-muted-foreground font-mono mb-3">
        Factions ranked by combined supply chain risk factors. Higher scores indicate greater need for logistical support missions.
      </p>
      <div className="space-y-2">
        {scored.map(faction => {
          const pri = priorityLabel(faction.score);
          return (
            <div key={faction.id} className={`border rounded-sm p-3 ${pri.bg}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-3 w-3 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: faction.faction_color }} />
                  <span className="text-[11px] font-mono font-semibold text-foreground">{faction.faction_tag} {faction.faction_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono font-bold tracking-wider ${pri.color}`}>
                    {pri.label}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    SCORE: {faction.score}
                  </span>
                </div>
              </div>
              {faction.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {faction.reasons.map((reason, i) => (
                    <span key={i} className="text-[8px] font-mono text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-sm">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DataCard>
  );
}