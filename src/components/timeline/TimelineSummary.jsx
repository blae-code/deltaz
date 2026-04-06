import { ArrowLeftRight, Shield, AlertTriangle, Flame } from "lucide-react";

export default function TimelineSummary({ logs, factionMap }) {
  const statusChanges = logs.filter((l) => l.event_type === "status_change").length;
  const controlChanges = logs.filter((l) => l.event_type === "control_change").length;
  const threatChanges = logs.filter((l) => l.event_type === "threat_change").length;

  // Count unique factions involved in control changes
  const factionIds = new Set();
  logs.forEach((l) => {
    if (l.old_faction_id) factionIds.add(l.old_faction_id);
    if (l.new_faction_id) factionIds.add(l.new_faction_id);
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <MiniStat icon={ArrowLeftRight} label="STATUS CHANGES" value={statusChanges} color="text-primary" />
      <MiniStat icon={Shield} label="CONTROL SHIFTS" value={controlChanges} color="text-accent" />
      <MiniStat icon={AlertTriangle} label="THREAT CHANGES" value={threatChanges} color="text-status-danger" />
      <MiniStat icon={Flame} label="FACTIONS INVOLVED" value={factionIds.size} color="text-status-warn" />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="border border-border bg-card rounded-sm p-2 text-center">
      <div className="flex items-center justify-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className={`text-base font-bold font-display ${color}`}>{value}</span>
      </div>
      <p className="text-[7px] text-muted-foreground tracking-widest mt-0.5">{label}</p>
    </div>
  );
}