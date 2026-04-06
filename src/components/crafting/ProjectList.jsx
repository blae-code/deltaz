import ProjectCard from "./ProjectCard";
import EmptyState from "../terminal/EmptyState";
import { Hammer } from "lucide-react";

export default function ProjectList({ projects, inventory, userEmail, userCallsign }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Hammer}
        title="No Crafting Projects"
        why="You haven't started tracking any builds yet. Projects let you plan what to craft and check off materials as you scavenge them."
        action='Open the RECIPES browser above to pick a blueprint, or hit NEW PROJECT to define a custom build from scratch.'
      />
    );
  }

  return (
    <div className="space-y-3">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          inventory={inventory}
          userEmail={userEmail}
          userCallsign={userCallsign}

        />
      ))}
    </div>
  );
}