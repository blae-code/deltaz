import { Crosshair, CheckCircle, XCircle, Clock } from "lucide-react";

export default function MissionStats({ jobs, userEmail }) {
  const myJobs = jobs.filter(j => j.assigned_to === userEmail);
  const available = jobs.filter(j => j.status === "available").length;
  const myActive = myJobs.filter(j => j.status === "in_progress").length;
  const myCompleted = myJobs.filter(j => j.status === "completed").length;
  const myFailed = myJobs.filter(j => j.status === "failed").length;

  const stats = [
    { label: "AVAILABLE", value: available, icon: Crosshair, color: "text-primary" },
    { label: "YOUR ACTIVE", value: myActive, icon: Clock, color: "text-accent" },
    { label: "COMPLETED", value: myCompleted, icon: CheckCircle, color: "text-status-ok" },
    { label: "FAILED", value: myFailed, icon: XCircle, color: "text-status-danger" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.label} className="border border-border bg-card rounded-sm p-2.5 text-center">
          <s.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${s.color}`} />
          <div className="text-[9px] text-muted-foreground tracking-wider">{s.label}</div>
          <div className={`text-lg font-bold font-display ${s.color}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}