import { useState } from "react";
import { performServerPowerAction } from "@/api/serverApi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Play, Square, RotateCcw, Skull, Loader2 } from "lucide-react";

const actions = [
  { id: "start", label: "START", icon: Play, variant: "default", confirm: false },
  { id: "restart", label: "RESTART", icon: RotateCcw, variant: "outline", confirm: true },
  { id: "stop", label: "STOP", icon: Square, variant: "outline", confirm: true },
  { id: "kill", label: "KILL", icon: Skull, variant: "destructive", confirm: true },
];

export default function ServerPowerControls({ currentState, onActionComplete }) {
  const [pending, setPending] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const { toast } = useToast();

  const handleAction = async (actionId) => {
    const act = actions.find((a) => a.id === actionId);
    if (act.confirm && confirming !== actionId) {
      setConfirming(actionId);
      return;
    }
    setConfirming(null);
    setPending(actionId);
    try {
      await performServerPowerAction(actionId);
      toast({ title: `Server ${actionId} signal sent` });
      setTimeout(() => onActionComplete(), 3000);
    } catch (err) {
      toast({ title: "Power action failed", description: err.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const isDisabled = (id) => {
    if (pending) return true;
    if (currentState === "running" && id === "start") return true;
    if (currentState === "offline" && (id === "stop" || id === "restart" || id === "kill")) return true;
    return false;
  };

  return (
    <div className="border border-border bg-card rounded-sm p-4">
      <h3 className="text-xs font-mono text-muted-foreground tracking-widest mb-3 uppercase">
        Power Controls
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((act) => (
          <Button
            key={act.id}
            variant={confirming === act.id ? "destructive" : act.variant}
            size="sm"
            className="text-[10px] font-mono uppercase tracking-wider h-9"
            disabled={isDisabled(act.id)}
            onClick={() => handleAction(act.id)}
          >
            {pending === act.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <act.icon className="h-3.5 w-3.5 mr-1" />
            )}
            {confirming === act.id ? `CONFIRM ${act.label}?` : act.label}
          </Button>
        ))}
      </div>
      {confirming && (
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground mt-2 font-mono"
          onClick={() => setConfirming(null)}
        >
          [CANCEL]
        </button>
      )}
    </div>
  );
}
