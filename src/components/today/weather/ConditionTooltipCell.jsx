import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A single environment metric cell with a tooltip explaining gameplay impact.
 */
export default function ConditionTooltipCell({ icon: Icon, label, value, color, tooltip, pulseColor }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="bg-card/80 px-3 py-2.5 cursor-help group hover:bg-card transition-colors relative overflow-hidden">
            {pulseColor && (
              <div
                className="absolute inset-0 opacity-20 animate-pulse pointer-events-none"
                style={{ background: pulseColor }}
              />
            )}
            <div className="flex items-center gap-1 mb-0.5 relative">
              <Icon className={`h-3 w-3 ${color || "text-muted-foreground"} transition-transform group-hover:scale-110`} />
              <span className="text-[8px] text-muted-foreground tracking-widest uppercase">{label}</span>
            </div>
            <span className={`text-[11px] font-mono font-semibold uppercase relative ${color}`}>{value}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-[11px] leading-relaxed bg-card border-border">
          <p className="font-semibold text-primary mb-0.5">{label}</p>
          <p className="text-muted-foreground">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}