import MissionCard from "./MissionCard";
import EmptyState from "../terminal/EmptyState";
import { Crosshair } from "lucide-react";

export default function MyMissionsPanel({ jobs, factions, territories, userEmail, isAdmin }) {
  const myJobs = jobs.filter(j => j.assigned_to === userEmail && j.status === "in_progress");

  if (myJobs.length === 0) {
    return (
      <EmptyState
        icon={Crosshair}
        title="No Active Missions"
        why="You haven't accepted any missions yet. Active missions you're assigned to will appear here for quick access."
        action="Scroll down to the mission board and accept a posting that matches your skills."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-accent font-mono tracking-widest uppercase font-semibold">
        YOUR ACTIVE OPS ({myJobs.length})
      </div>
      {myJobs.map(job => (
        <MissionCard
          key={job.id}
          job={job}
          faction={factions.find(f => f.id === job.faction_id)}
          territory={territories.find(t => t.id === job.territory_id)}
          userEmail={userEmail}
          isAdmin={isAdmin}

        />
      ))}
    </div>
  );
}