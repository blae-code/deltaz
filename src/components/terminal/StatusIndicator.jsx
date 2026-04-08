import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const statusColors = {
  online:    "bg-status-ok",
  offline:   "bg-muted-foreground",
  warning:   "bg-status-warn",
  critical:  "bg-status-danger",
  active:    "bg-status-ok",
  mia:       "bg-status-warn",
  kia:       "bg-status-danger",
  extracted: "bg-status-info",
};

const statusDescriptions = {
  online:    "Systems nominal — connection active and stable",
  offline:   "Offline — no contact with this node",
  warning:   "Warning — degraded state or partial signal",
  critical:  "Critical — immediate attention required",
  active:    "Active — operative is currently in the field",
  mia:       "MIA — operative whereabouts unknown",
  kia:       "KIA — operative confirmed lost",
  extracted: "Extracted — mission complete, operative has returned",
};

/**
 * StatusIndicator — colored dot with optional label.
 *
 * @param {"online"|"offline"|"warning"|"critical"|"active"|"mia"|"kia"|"extracted"} status
 * @param {string} label - text shown next to the dot
 * @param {string} tooltip - override tooltip text (defaults to statusDescriptions[status])
 * @param {boolean} noTooltip - suppress the tooltip entirely
 */
export default function StatusIndicator({ status = "online", label, tooltip, noTooltip, className }) {
  const dot = (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn(
        "h-2 w-2 rounded-full shrink-0",
        statusColors[status] || "bg-muted-foreground",
        (status === "online" || status === "active") && "pulse-glow"
      )} />
      {label && (
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      )}
    </div>
  );

  if (noTooltip) return dot;

  const tipText = tooltip || statusDescriptions[status];
  if (!tipText) return dot;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{dot}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30 max-w-[220px]">
          <p className="text-muted-foreground">{tipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
