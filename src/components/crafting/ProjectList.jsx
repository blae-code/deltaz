import { Link } from "react-router-dom";
import ProjectCard from "./ProjectCard";
import EmptyState from "../terminal/EmptyState";
import { Button } from "@/components/ui/button";
import { Hammer, ArrowLeftRight } from "lucide-react";

export default function ProjectList({ projects: rawProjects, inventory, userEmail, userCallsign }) {
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Hammer}
        title="No Active Builds"
        why="The workbench is clear. Crafting projects let you track which materials you still need and when a build is ready to assemble."
        action="Browse RECIPES above to start from a known blueprint, or hit NEW PROJECT to plan a custom build. Materials check off automatically as you scavenge."
        cta={
          <Link to="/trade">
            <Button variant="outline" size="sm" className="text-[10px] uppercase tracking-wider h-7">
              <ArrowLeftRight className="h-3 w-3 mr-1" /> Browse Trade Hub
            </Button>
          </Link>
        }
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