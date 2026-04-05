import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Radio, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
    <div className="flex items-center gap-3 border border-border bg-card rounded-sm px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-[10px] font-mono text-primary tracking-widest">WORLD PULSE ACTIVE</span>
      </div>
      <span className="text-[9px] text-muted-foreground">Auto-cycle: 30 min</span>
      {isAdmin && (
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
      )}
    </div>
  );
}