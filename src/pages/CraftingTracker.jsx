import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import DataCard from "../components/terminal/DataCard";
import PageShell from "../components/layout/PageShell";
import StatusStrip from "../components/layout/StatusStrip";
import ActionRail from "../components/layout/ActionRail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Hammer, BookOpen, Archive, CheckCircle, Clock, Package } from "lucide-react";
import ProjectList from "../components/crafting/ProjectList";
import CreateProjectForm from "../components/crafting/CreateProjectForm";
import RecipeBrowser from "../components/crafting/RecipeBrowser";

export default function CraftingTracker() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    base44.auth.me().then((u) => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const projectsQuery = useEntityQuery(
    ["craftingProjects", user?.email],
    () => user ? base44.entities.CraftingProject.filter({ owner_email: user.email }, "-created_date", 100) : Promise.resolve([]),
    { subscribeEntities: ["CraftingProject"], queryOpts: { enabled: !!user?.email } }
  );
  const { data: projects = [], syncMeta: craftingSyncMeta } = projectsQuery;

  useRegisterSync("crafting", projectsQuery);

  const { data: inventory = [] } = useEntityQuery(
    ["inventory", user?.email],
    () => user ? base44.entities.InventoryItem.filter({ owner_email: user.email }, "-created_date", 200) : Promise.resolve([]),
    { subscribeEntities: ["InventoryItem"], queryOpts: { enabled: !!user?.email } }
  );
  const { data: recipes = [] } = useEntityQuery(
    "recipes",
    () => base44.entities.Recipe.filter({ is_available: true }, "name", 100),
    { subscribeEntities: ["Recipe"] }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">LOADING WORKBENCH...</div>
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === "gathering" || p.status === "ready");
  const completedProjects = projects.filter(p => p.status === "completed" || p.status === "abandoned");
  const filteredProjects = filter === "active" ? activeProjects : filter === "completed" ? completedProjects : projects;

  const totalMaterialsNeeded = activeProjects.reduce((sum, p) => sum + (p.materials?.length || 0), 0);
  const totalGathered = activeProjects.reduce((sum, p) => {
    return sum + (p.materials || []).filter(m => (m.have || 0) >= (m.needed || 1)).length;
  }, 0);

  const statusItems = [
    { label: "Active Projects", value: activeProjects.length, color: "text-primary" },
    { label: "Materials Sourced", value: `${totalGathered}/${totalMaterialsNeeded}`, color: "text-accent" },
    { label: "Ready to Build", value: projects.filter(p => p.status === "ready").length, color: "text-status-ok" },
    { label: "Completed", value: completedProjects.filter(p => p.status === "completed").length, color: "text-foreground" },
  ];

  const filterTabs = [
    { key: "active", label: "Active", icon: Clock, count: activeProjects.length },
    { key: "completed", label: "Completed", icon: CheckCircle, count: completedProjects.length },
    { key: "all", label: "All", icon: Package, count: projects.length },
  ];

  return (
    <PageShell
      title="Workbench"
      subtitle="Track materials, plan builds, and source what you need"
      syncMeta={craftingSyncMeta}
      actions={
        <>
          <Button variant={showRecipes ? "default" : "outline"} size="sm" className="text-[10px] uppercase tracking-wider h-7" onClick={() => { setShowRecipes(!showRecipes); setShowCreate(false); }}>
            <BookOpen className="h-3 w-3 mr-1" /> RECIPES
          </Button>
          <Button variant={showCreate ? "default" : "outline"} size="sm" className="text-[10px] uppercase tracking-wider h-7" onClick={() => { setShowCreate(!showCreate); setShowRecipes(false); }}>
            <Plus className="h-3 w-3 mr-1" /> NEW PROJECT
          </Button>
        </>
      }
      statusStrip={<StatusStrip items={statusItems} />}
      actionRail={<ActionRail tabs={filterTabs} active={filter} onChange={setFilter} />}
    >
      {/* Recipe browser */}
      {showRecipes && (
        <RecipeBrowser
          recipes={recipes}
          inventory={inventory}
          userEmail={user?.email}
          onProjectCreated={() => setShowRecipes(false)}
        />
      )}

      {/* Create form */}
      {showCreate && (
        <DataCard title="New Crafting Project">
          <CreateProjectForm
            userEmail={user?.email}
            recipes={recipes}
            onCreated={() => setShowCreate(false)}
          />
        </DataCard>
      )}

      {/* Project list */}
      <ProjectList
        projects={filteredProjects}
        inventory={inventory}
        userEmail={user?.email}
        userCallsign={user?.callsign || user?.full_name}
      />
    </PageShell>
  );
}