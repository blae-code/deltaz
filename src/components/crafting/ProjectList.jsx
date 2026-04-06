import ProjectCard from "./ProjectCard";

export default function ProjectList({ projects, inventory, userEmail, userCallsign, onUpdate }) {
  if (projects.length === 0) {
    return (
      <div className="border border-border border-dashed rounded-sm p-8 text-center space-y-2">
        <p className="text-xs text-muted-foreground font-mono">No projects here yet.</p>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-sm mx-auto">
          Crafting projects let you track the materials needed to build something.
          Pick a recipe or create a custom project, then check off materials as you gather them.
        </p>
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