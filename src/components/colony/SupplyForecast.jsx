import { Wheat, Droplets, Zap, TrendingDown, Clock, AlertTriangle } from "lucide-react";

/**
 * SupplyForecast — Predicts how many days the colony can sustain food, water, and power
 * based on current levels and population-driven consumption rates.
 *
 * Consumption model (per day):
 *   food:  population × 2 units  (each person eats ~2% of max per day)
 *   water: population × 1.5 units
 *   power: base drain of 3 + population × 0.5
 *
 * Farmer/cook/scavenge survivors reduce net drain via production offsets.
 */

const RESOURCE_CONFIG = [
  { key: "food",  field: "food_reserves",  icon: Wheat,    label: "Food",  baseRate: 0, perCapita: 2,   prodTasks: ["farm", "cook"] },
  { key: "water", field: "water_supply",   icon: Droplets, label: "Water", baseRate: 0, perCapita: 1.5, prodTasks: ["scavenge"] },
  { key: "power", field: "power_level",    icon: Zap,      label: "Power", baseRate: 3, perCapita: 0.5, prodTasks: ["repair"] },
];

function estimateDays(currentLevel, dailyConsumption, dailyProduction) {
  const netDrain = dailyConsumption - dailyProduction;
  if (netDrain <= 0) return Infinity; // production meets or exceeds consumption
  return currentLevel / netDrain;
}

function getDaysColor(days) {
  if (days === Infinity) return "text-status-ok";
  if (days >= 14) return "text-status-ok";
  if (days >= 7) return "text-primary";
  if (days >= 3) return "text-status-warn";
  return "text-status-danger";
}

function getDaysLabel(days) {
  if (days === Infinity) return "SUSTAINABLE";
  if (days < 1) return "< 1 DAY";
  return `~${Math.floor(days)} DAYS`;
}

function getUrgency(days) {
  if (days === Infinity) return null;
  if (days < 3) return "critical";
  if (days < 7) return "warning";
  return null;
}

export default function SupplyForecast({ colony, survivors, compact }) {
  if (!colony) return null;

  const pop = colony.population || 0;
  const activeSurvivors = (survivors || []).filter(s => s.status === "active");

  // Count survivors doing production tasks
  const taskCounts = {};
  activeSurvivors.forEach(s => {
    if (s.current_task && s.current_task !== "idle") {
      taskCounts[s.current_task] = (taskCounts[s.current_task] || 0) + 1;
    }
  });

  const forecasts = RESOURCE_CONFIG.map(cfg => {
    const current = colony[cfg.field] ?? 100;
    const dailyConsumption = cfg.baseRate + (pop * cfg.perCapita);
    // Each producing survivor offsets ~3 units/day
    const producing = cfg.prodTasks.reduce((sum, t) => sum + (taskCounts[t] || 0), 0);
    const dailyProduction = producing * 3;
    const days = estimateDays(current, dailyConsumption, dailyProduction);
    const urgency = getUrgency(days);

    return {
      ...cfg,
      current,
      dailyConsumption: Math.round(dailyConsumption * 10) / 10,
      dailyProduction: Math.round(dailyProduction * 10) / 10,
      producing,
      days,
      urgency,
    };
  });

  const worstDays = Math.min(...forecasts.map(f => f.days === Infinity ? 999 : f.days));
  const hasCritical = forecasts.some(f => f.urgency === "critical");

  if (compact) {
    return <CompactForecast forecasts={forecasts} worstDays={worstDays} hasCritical={hasCritical} />;
  }

  return (
    <div className="space-y-2.5">
      {/* Summary bar */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-sm border ${
        hasCritical
          ? "border-status-danger/30 bg-status-danger/5"
          : worstDays < 7
            ? "border-status-warn/30 bg-status-warn/5"
            : "border-border bg-secondary/30"
      }`}>
        <Clock className={`h-3.5 w-3.5 shrink-0 ${hasCritical ? "text-status-danger" : worstDays < 7 ? "text-status-warn" : "text-primary"}`} />
        <span className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
          SUPPLY RUNWAY:
        </span>
        <span className={`text-[10px] font-mono font-bold ${getDaysColor(worstDays)}`}>
          {worstDays >= 999 ? "ALL SUSTAINABLE" : `${Math.floor(worstDays)} DAYS (WORST)`}
        </span>
      </div>

      {/* Per-resource breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {forecasts.map(f => {
          const Icon = f.icon;
          return (
            <div
              key={f.key}
              className={`border rounded-sm p-3 ${
                f.urgency === "critical"
                  ? "border-status-danger/30 bg-status-danger/5"
                  : f.urgency === "warning"
                    ? "border-status-warn/20 bg-status-warn/5"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${getDaysColor(f.days)}`} />
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono">{f.label}</span>
                </div>
                <span className={`text-sm font-bold font-mono ${getDaysColor(f.days)}`}>
                  {getDaysLabel(f.days)}
                </span>
              </div>

              {/* Depletion bar */}
              <ForecastBar days={f.days} />

              {/* Details */}
              <div className="mt-2 space-y-0.5">
                <DetailRow label="Current" value={`${f.current}%`} />
                <DetailRow label="Consumption" value={`${f.dailyConsumption}/day`} color="text-status-danger" />
                <DetailRow label="Production" value={f.dailyProduction > 0 ? `+${f.dailyProduction}/day (${f.producing} assigned)` : "None"} color={f.dailyProduction > 0 ? "text-status-ok" : "text-muted-foreground"} />
              </div>

              {f.urgency === "critical" && (
                <div className="flex items-center gap-1 mt-2 text-[8px] text-status-danger font-mono animate-pulse">
                  <AlertTriangle className="h-2.5 w-2.5" /> CRITICAL — ASSIGN PRODUCERS NOW
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ForecastBar({ days }) {
  // Map days to a visual: 0 days = empty, 14+ days = full
  const pct = days === Infinity ? 100 : Math.min(100, Math.max(2, (days / 14) * 100));
  const color = days === Infinity ? "bg-status-ok" : days >= 7 ? "bg-primary" : days >= 3 ? "bg-status-warn" : "bg-status-danger";
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color} ${days < 3 ? "animate-pulse" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DetailRow({ label, value, color }) {
  return (
    <div className="flex justify-between text-[8px] font-mono">
      <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={color || "text-foreground"}>{value}</span>
    </div>
  );
}

/** Compact version for the Today page colony card */
function CompactForecast({ forecasts, worstDays, hasCritical }) {
  return (
    <div className={`border rounded-sm px-3 py-2 ${
      hasCritical ? "border-status-danger/30 bg-status-danger/5" : worstDays < 7 ? "border-status-warn/20 bg-status-warn/5" : "border-border bg-secondary/20"
    }`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <TrendingDown className={`h-3 w-3 ${hasCritical ? "text-status-danger" : "text-muted-foreground"}`} />
        <span className="text-[9px] text-muted-foreground font-mono tracking-widest uppercase">SUPPLY FORECAST</span>
      </div>
      <div className="flex gap-3">
        {forecasts.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.key} className="flex items-center gap-1">
              <Icon className={`h-3 w-3 ${getDaysColor(f.days)}`} />
              <span className={`text-[10px] font-mono font-semibold ${getDaysColor(f.days)}`}>
                {getDaysLabel(f.days)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}