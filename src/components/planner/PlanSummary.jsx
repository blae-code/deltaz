import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, AlertTriangle, Loader2 } from "lucide-react";

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
  onGeneratePlan, isGeneratingPlan
}) {
  const canGenerate = title && selectedTerritory && assignedCount > 0;
  const isHighRisk = assessment && assessment.success_probability < 40;

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          Operation Config
        </h3>
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

        <div className="border-t border-border pt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Territory:</span>
              <span className="text-foreground">{selectedTerritory?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Squad:</span>
              <span className="text-foreground">{assignedCount} operative{assignedCount !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {isHighRisk && (
            <div className="flex items-center gap-1.5 bg-status-danger/10 border border-status-danger/20 rounded-sm px-2 py-1.5">
              <AlertTriangle className="h-3 w-3 text-status-danger shrink-0" />
              <span className="text-[9px] text-status-danger font-mono">
                HIGH RISK — Success probability below 40%. Proceed with caution.
              </span>
            </div>
          )}

          <Button
            className="w-full h-9 text-[10px] uppercase tracking-widest font-mono"
            disabled={!canGenerate || isGeneratingPlan}
            onClick={onGeneratePlan}
          >
            {isGeneratingPlan ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" /> GENERATING...</>
            ) : (
              <><Rocket className="h-3 w-3 mr-1.5" /> GENERATE PLAN</>
            )}
          </Button>
          {!canGenerate && (
            <p className="text-[8px] text-muted-foreground text-center font-mono">
              {!title ? "Name the operation" : !selectedTerritory ? "Select a target territory" : "Assign at least one operative"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}