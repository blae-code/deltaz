import { cn } from "@/lib/utils";

/**
 * ColonyVitalGauge — A single interactive stat gauge with threshold coloring.
 * When value is below `warnThreshold`, it shows a warning state.
 * When value is below `critThreshold`, it shows critical state.
 * Optional `onClick` enables GM interaction.
 */
export default function ColonyVitalGauge({ icon: Icon, label, value, max = 100, warnThreshold = 40, critThreshold = 20, unit = "%", onClick, actionLabel }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const isCrit = value <= critThreshold;
  const isWarn = value <= warnThreshold && !isCrit;
  const isOk = !isCrit && !isWarn;

  const barColor = isCrit ? "bg-status-danger" : isWarn ? "bg-status-warn" : "bg-primary";
  const textColor = isCrit ? "text-status-danger" : isWarn ? "text-status-warn" : "text-primary";
  const borderColor = isCrit ? "border-status-danger/30" : isWarn ? "border-status-warn/20" : "border-border";
  const bgColor = isCrit ? "bg-status-danger/5" : isWarn ? "bg-status-warn/5" : "bg-card";

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "border rounded-sm p-3 transition-all text-left w-full",
        borderColor, bgColor,
        onClick && "hover:ring-1 hover:ring-primary/30 cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", textColor)} />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{label}</span>
        </div>
        <span className={cn("text-sm font-bold font-mono", textColor)}>
          {value}{unit}
        </span>
      </div>

      {/* Bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor, isCrit && "animate-pulse")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Action hint for clickable gauges */}
      {onClick && (isCrit || isWarn) && actionLabel && (
        <div className={cn("mt-1.5 text-[8px] font-mono tracking-wider uppercase", textColor)}>
          ⚡ {actionLabel}
        </div>
      )}
    </Wrapper>
  );
}