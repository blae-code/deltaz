import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, AlertTriangle, Loader2 } from "lucide-react";
import InlineConfirm from "../terminal/InlineConfirm";

// SAFETY: MissionPlan.operation_type enum: assault|recon|defense|sabotage|scavenge|escort.
// These must match the backend entity schema. If the schema changes, update this list.
const opTypes = [
  { value: "recon", label: "Recon", desc: "Scout the area for intel" },
  { value: "assault", label: "Assault", desc: "Direct engagement — high risk" },
  { value: "defense", label: "Defense", desc: "Fortify and hold position" },
  { value: "sabotage", label: "Sabotage", desc: "Disrupt enemy operations" },
  { value: "scavenge", label: "Scavenge", desc: "Resource recovery run" },
  { value: "escort", label: "Escort", desc: "Protect VIP or convoy" },
];

export default function PlanSummary({
  title, setTitle, operationType, setOperationType,
  selectedTerritory, assignedCount, assessment,
  onDeploy, deploying
}) {
  const canDeploy = title && selectedTerritory && assignedCount > 0;
  // Defensive: assessment may be null or have unexpected shape from riskAssessment function
  const successProb = assessment?.success_probability ?? null;
  const isHighRisk = successProb !== null && successProb < 40;
  const isSuicidal = successProb !== null && successProb < 20;

  // Build deployment warning based on context
  const getDeployWarning = () => {
    const parts = [];
    parts.push(`Deploy ${assignedCount} operative${assignedCount !== 1 ? "s" : ""} to ${selectedTerritory?.name || "unknown territory"} on a ${operationType} operation.`);
    if (isSuicidal) {
      parts.push("EXTREMELY LOW success probability — expect heavy casualties.");
    } else if (isHighRisk) {
      parts.push("Low success probability — operatives may be lost or injured.");
    }
    parts.push("This action cannot be undone.");
    return parts.join(" ");
  };

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          Operation Config
        </h3>
        <p className="text-[8px] text-muted-foreground mt-0.5">
          Name the op, choose its type, then deploy when ready.
        </p>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono block mb-1">Operation Name</label>
          <Input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Operation Blackout"
            className="h-8 text-[11px] bg-secondary/50 border-border font-mono"
          />
        </div>

        <div>
          <label className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono block mb-1">Operation Type</label>
          <Select value={operationType} onValueChange={setOperationType}>
            <SelectTrigger className="h-8 text-[11px] bg-secondary/50 border-border font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="text-[10px] font-mono">{t.label}</span>
                  <span className="text-[8px] text-muted-foreground ml-2">{t.desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Readiness checklist */}
        <div className="border-t border-border pt-3 space-y-2">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Deployment Readiness</span>
          <div className="space-y-1 text-[9px] font-mono">
            <ReadinessItem label="Territory selected" ok={!!selectedTerritory} value={selectedTerritory?.name} />
            <ReadinessItem label="Squad assigned" ok={assignedCount > 0} value={`${assignedCount} operative${assignedCount !== 1 ? "s" : ""}`} />
            <ReadinessItem label="Operation named" ok={!!title} value={title || "—"} />
            {assessment && (
              <ReadinessItem
                label="Risk assessed"
                ok={!isSuicidal}
                value={successProb !== null ? `${successProb}% success` : "calculating..."}
                warn={isHighRisk}
              />
            )}
          </div>
        </div>

        {/* Risk warnings */}
        {isSuicidal && (
          <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 rounded-sm px-2 py-1.5">
            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
            <span className="text-[9px] text-destructive font-mono">
              SUICIDE RISK — Below 20% success. Most operatives will not return.
            </span>
          </div>
        )}
        {isHighRisk && !isSuicidal && (
          <div className="flex items-center gap-1.5 bg-status-warn/10 border border-status-warn/20 rounded-sm px-2 py-1.5">
            <AlertTriangle className="h-3 w-3 text-status-warn shrink-0" />
            <span className="text-[9px] text-status-warn font-mono">
              HIGH RISK — Below 40% success. Consider adding more operatives or changing approach.
            </span>
          </div>
        )}

        {/* Deploy button with inline confirmation */}
        {canDeploy ? (
          <InlineConfirm
            variant="default"
            size="default"
            className={`w-full h-9 text-[10px] uppercase tracking-widest font-mono ${
              isSuicidal ? "bg-destructive hover:bg-destructive/90" : ""
            }`}
            confirmLabel={isSuicidal ? "DEPLOY ANYWAY — ACCEPT LOSSES" : "CONFIRM DEPLOYMENT"}
            warning={getDeployWarning()}
            severity={isSuicidal ? "danger" : isHighRisk ? "danger" : "warning"}
            onConfirm={onDeploy}
            disabled={deploying}
          >
            {deploying ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" /> DEPLOYING...</>
            ) : (
              <><Rocket className="h-3 w-3 mr-1.5" /> DEPLOY OPERATION</>
            )}
          </InlineConfirm>
        ) : (
          <div className="text-center space-y-1 py-2">
            <p className="text-[9px] text-muted-foreground font-mono">
              {!selectedTerritory ? "① Select a target territory from the list" :
               assignedCount === 0 ? "② Drag operatives from the pool onto the territory" :
               "③ Name the operation above to enable deployment"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadinessItem({ label, ok, value, warn }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          ok ? (warn ? "bg-status-warn" : "bg-status-ok") : "bg-muted-foreground/30"
        }`} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className={`text-foreground truncate max-w-[120px] ${warn ? "text-status-warn" : ""}`}>{value || "—"}</span>
    </div>
  );
}