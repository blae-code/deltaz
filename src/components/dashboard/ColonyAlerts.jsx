import { AlertTriangle, ShieldAlert } from "lucide-react";

export default function ColonyAlerts({ alerts, warnings, lastIncident }) {
  if (alerts.length === 0 && warnings.length === 0 && !lastIncident) return null;

  return (
    <div className="space-y-2">
      {/* Critical alerts */}
      {alerts.length > 0 && (
        <div className="border border-status-danger/30 bg-status-danger/5 rounded-sm p-2.5 flex items-start gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-status-danger shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="text-[10px] text-status-danger font-semibold tracking-wider">CRITICAL — COLONY AT RISK</p>
            <p className="text-[9px] text-status-danger/80 mt-0.5">
              {alerts.map(a => `${a.label}: ${a.value}%`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="border border-accent/20 bg-accent/5 rounded-sm p-2.5 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-accent font-semibold tracking-wider">WARNING — LOW RESERVES</p>
            <p className="text-[9px] text-accent/80 mt-0.5">
              {warnings.map(w => `${w.label}: ${w.value}%`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Last incident */}
      {lastIncident && (
        <p className="text-[9px] text-muted-foreground italic border-l-2 border-border pl-2">
          Last Incident: {lastIncident}
        </p>
      )}
    </div>
  );
}