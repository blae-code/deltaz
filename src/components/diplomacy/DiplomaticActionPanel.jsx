import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Swords, Shield, Flag, Handshake, AlertTriangle,
  Loader2, ChevronDown, ChevronUp,
} from "lucide-react";

const ACTIONS = [
  {
    key: "declare_war",
    label: "Declare War",
    icon: Swords,
    color: "text-status-danger",
    bg: "bg-status-danger/10 border-status-danger/30 hover:bg-status-danger/20",
    desc: "Formally declare open war. All treaties revoked. Border territories contested.",
    requiresConfirm: true,
    needsReason: true,
    validFrom: ["neutral", "hostile", "ceasefire", "trade_agreement"],
  },
  {
    key: "set_hostile",
    label: "Declare Hostility",
    icon: AlertTriangle,
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/30 hover:bg-orange-400/20",
    desc: "Declare hostile intent. A formal warning before war.",
    requiresConfirm: false,
    needsReason: true,
    validFrom: ["neutral", "ceasefire", "trade_agreement"],
  },
  {
    key: "propose_ceasefire",
    label: "Propose Ceasefire",
    icon: Shield,
    color: "text-accent",
    bg: "bg-accent/10 border-accent/30 hover:bg-accent/20",
    desc: "Suspend hostilities for 7 days. Must be at war or hostile.",
    requiresConfirm: false,
    needsReason: false,
    validFrom: ["war", "hostile"],
  },
  {
    key: "normalize",
    label: "Normalize Relations",
    icon: Handshake,
    color: "text-muted-foreground",
    bg: "bg-muted border-border hover:bg-secondary",
    desc: "Reset diplomatic status to neutral.",
    requiresConfirm: false,
    needsReason: false,
    validFrom: ["hostile", "ceasefire", "war"],
  },
];

export default function DiplomaticActionPanel({
  factionA, factionB, currentStatus, userFactionIds, onActionComplete,
}) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const myFactionId = userFactionIds.find(
    id => id === factionA?.id || id === factionB?.id
  );
  const targetFactionId = myFactionId === factionA?.id ? factionB?.id : factionA?.id;
  const myFaction = myFactionId === factionA?.id ? factionA : factionB;
  const targetFaction = myFactionId === factionA?.id ? factionB : factionA;

  if (!myFactionId) return null;

  const status = currentStatus || "neutral";
  const availableActions = ACTIONS.filter(a => a.validFrom.includes(status));

  const executeAction = async () => {
    if (!selectedAction) return;
    const actionDef = ACTIONS.find(a => a.key === selectedAction);
    if (actionDef?.requiresConfirm && !confirmed) return;

    setExecuting(true);
    try {
      await base44.functions.invoke("diplomacyActions", {
        action: selectedAction,
        initiator_faction_id: myFactionId,
        target_faction_id: targetFactionId,
        reason: reason.trim(),
        terms: reason.trim(),
      });

      const labels = {
        declare_war: "War declared",
        set_hostile: "Hostility declared",
        propose_ceasefire: "Ceasefire proposed",
        normalize: "Relations normalized",
      };
      toast({ title: labels[selectedAction] || "Action completed" });
      setSelectedAction(null);
      setReason("");
      setConfirmed(false);
      onActionComplete?.();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Flag className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
            Diplomatic Actions
          </span>
          <Badge variant="outline" className="text-[7px]">{status.replace("_", " ").toUpperCase()}</Badge>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          <p className="text-[9px] text-muted-foreground">
            Acting as <span className="text-foreground font-semibold">{myFaction?.name}</span> toward{" "}
            <span className="text-foreground font-semibold">{targetFaction?.name}</span>
          </p>

          {availableActions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No diplomatic actions available for the current status.</p>
          ) : (
            <div className="grid gap-1.5">
              {availableActions.map(a => (
                <button
                  key={a.key}
                  onClick={() => { setSelectedAction(a.key === selectedAction ? null : a.key); setConfirmed(false); setReason(""); }}
                  className={`flex items-start gap-2 p-2 rounded-sm border text-left transition-colors ${
                    selectedAction === a.key ? a.bg + " ring-1 ring-primary/20" : "border-border bg-card hover:bg-secondary/30"
                  }`}
                >
                  <a.icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${a.color}`} />
                  <div>
                    <span className={`text-[10px] font-semibold ${selectedAction === a.key ? a.color : "text-foreground"}`}>
                      {a.label}
                    </span>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedAction && (() => {
            const actionDef = ACTIONS.find(a => a.key === selectedAction);
            return (
              <div className="space-y-2 border-t border-border/50 pt-2">
                {actionDef.needsReason && (
                  <div>
                    <Label className="text-[9px] font-mono tracking-wider">
                      {selectedAction === "declare_war" ? "REASON FOR WAR (OPTIONAL)" : "REASON (OPTIONAL)"}
                    </Label>
                    <Textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="State your reason..."
                      className="text-xs bg-muted mt-1"
                      rows={2}
                    />
                  </div>
                )}

                {actionDef.requiresConfirm && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                      className="rounded border-status-danger text-status-danger"
                    />
                    <span className="text-[9px] text-status-danger font-mono">
                      I confirm this declaration. All treaties will be revoked and territories contested.
                    </span>
                  </label>
                )}

                <Button
                  onClick={executeAction}
                  disabled={executing || (actionDef.requiresConfirm && !confirmed)}
                  variant={selectedAction === "declare_war" ? "destructive" : "default"}
                  className="w-full text-[10px] uppercase tracking-wider font-mono"
                >
                  {executing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  ) : (
                    <actionDef.icon className="h-3.5 w-3.5 mr-2" />
                  )}
                  {executing ? "EXECUTING..." : actionDef.label.toUpperCase()}
                </Button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}