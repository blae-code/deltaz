import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export default function StatCard({ label, value, icon: Icon, color, description, detail }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="border border-border bg-card rounded-sm p-4 group hover:border-primary/30 transition-colors relative">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-[10px] text-muted-foreground tracking-widest flex-1">{label}</span>
          {description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 hover:text-primary cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-[11px] font-mono bg-card border-primary/30">
                <p>{description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={`text-2xl font-bold font-display ${color}`}>{value}</div>
        {detail && (
          <p className="text-[9px] text-muted-foreground mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {detail}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}