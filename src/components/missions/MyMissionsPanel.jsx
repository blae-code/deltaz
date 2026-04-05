import MissionCard from "./MissionCard";

export default function MyMissionsPanel({ jobs, factions, territories, userEmail, isAdmin, onUpdate }) {
  const myJobs = jobs.filter(j => j.assigned_to === userEmail && j.status === "in_progress");

  if (myJobs.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4 border border-border rounded-sm bg-card">
        No active missions. Browse the board below to accept one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-accent font-mono tracking-widest uppercase">
        {myJobs.length} ACTIVE MISSION{myJobs.length !== 1 ? "S" : ""}
      </div>
      {myJobs.map(job => (
        <MissionCard
          key={job.id}
          job={job}
          faction={factions.find(f => f.id === job.faction_id)}
          territory={territories.find(t => t.id === job.territory_id)}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}