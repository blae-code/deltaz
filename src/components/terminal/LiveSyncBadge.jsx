import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TelemetrySignalSvg from "../svg/TelemetrySignalSvg";

/**
 * LiveSyncBadge — inline indicator showing real-time sync state for a data source.
 *
 * Props:
 *  - dataUpdatedAt: timestamp (ms) of last successful fetch
 *  - isFetching: currently refetching
 *  - isStale: React Query considers data stale
 *  - isError: last fetch failed
 *  - label: optional label like "JOBS" or "INVENTORY"
 */
export default function LiveSyncBadge({ dataUpdatedAt, isFetching, isStale, isError, label }) {
  const age = dataUpdatedAt ? Math.round((Date.now() - dataUpdatedAt) / 1000) : null;
  const isVeryStale = age !== null && age > 120; // >2 min

  let status = "synced";
  let statusColor = "text-status-ok";
  let statusVariant = "live";
  let statusLabel = "LIVE";
  let tooltip = "Data is current and receiving real-time updates.";

  if (isFetching) {
    status = "syncing";
    statusColor = "text-primary";
    statusVariant = "syncing";
    statusLabel = "SYNCING";
    tooltip = "Refreshing data from server...";
  } else if (isError) {
    status = "error";
    statusColor = "text-destructive";
    statusVariant = "error";
    statusLabel = "ERROR";
    tooltip = "Failed to fetch latest data. Will retry automatically.";
  } else if (isVeryStale || isStale) {
    status = "stale";
    statusColor = "text-status-warn";
    statusVariant = "stale";
    statusLabel = "STALE";
    tooltip = `Data is ${formatAge(age)} old. May not reflect latest changes.`;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5 cursor-help", statusColor)}>
            <TelemetrySignalSvg size={14} variant={statusVariant} animated={isFetching} className="shrink-0" />
            <span className="text-[10px] font-mono tracking-widest uppercase">
              {statusLabel}
            </span>
            {age !== null && !isFetching && status === "synced" && (
              <span className="text-[9px] font-mono text-muted-foreground/50 tracking-wider">
                {formatAge(age)}
              </span>
            )}
            {label && (
              <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
                · {label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-mono text-xs bg-card border-primary/30 max-w-[240px]">
          <p className={cn("font-semibold text-[10px] mb-0.5", statusColor)}>{statusLabel}</p>
          <p className="text-muted-foreground">{tooltip}</p>
          {age !== null && !isFetching && (
            <p className="text-muted-foreground/60 mt-0.5">Last update: {formatAge(age)} ago</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatAge(seconds) {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
