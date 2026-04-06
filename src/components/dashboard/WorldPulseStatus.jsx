import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Radio, RefreshCw, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function WorldPulseStatus({ isAdmin }) {
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const triggerPulse = async () => {
    setRunning(true);
    const res = await base44.functions.invoke("worldPulse", {});
    toast({
      title: "GHOST PROTOCOL — World Pulse",
      description: `Generated ${res.data.intel_generated} intel reports and ${res.data.events_generated} world events`,
    });
    setRunning(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex items-center gap-3 border border-border bg-card rounded-sm px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-[10px] font-mono text-primary tracking-widest">WORLD PULSE</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <span className="text-[9px] text-muted-foreground">Scheduled: every 30 min</span>
            <Info className="h-3 w-3 text-muted-foreground/50 hover:text-primary transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30 max-w-[260px]">
          <p className="text-primary font-semibold text-[10px] mb-1">WORLD PULSE ENGINE</p>
          <p className="text-muted-foreground">AI-driven scheduled process that generates new intel reports and world events every 30 minutes based on the current state of factions, territories, and missions. Admins can trigger a manual cycle below.</p>
        </TooltipContent>
      </Tooltip>
      {isAdmin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[9px] ml-auto tracking-wider text-muted-foreground hover:text-primary"
              onClick={triggerPulse}
              disabled={running}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${running ? "animate-spin" : ""}`} />
              {running ? "PULSING..." : "MANUAL PULSE"}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
            <p className="text-muted-foreground">Manually trigger a World Pulse cycle now instead of waiting for the next scheduled run.</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
    </TooltipProvider>
  );
}