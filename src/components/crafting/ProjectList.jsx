import ProjectCard from "./ProjectCard";

export default function ProjectList({ projects, inventory, userEmail, userCallsign, onUpdate }) {
  if (projects.length === 0) {
    return (
      <div className="border border-border border-dashed rounded-sm p-8 text-center">
        <p className="text-xs text-muted-foreground font-mono">No projects here. Create one to start tracking materials.</p>
      </div>
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
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}