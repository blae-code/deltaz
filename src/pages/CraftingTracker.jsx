import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import useCurrentUser from "../hooks/useCurrentUser";
import DataCard from "../components/terminal/DataCard";
import PageShell from "../components/layout/PageShell";
import StatusStrip from "../components/layout/StatusStrip";
import ActionRail from "../components/layout/ActionRail";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, CheckCircle, Clock, Package, ArrowLeftRight } from "lucide-react";
import NextStepBanner from "../components/terminal/NextStepBanner";
import ProjectList from "../components/crafting/ProjectList";
import CreateProjectForm from "../components/crafting/CreateProjectForm";
import RecipeBrowser from "../components/crafting/RecipeBrowser";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import StatusStripSkeleton from "../components/layout/StatusStripSkeleton";
import AuthLoadingState from "../components/terminal/AuthLoadingState";

export default function CraftingTracker() {
  const { user, loading } = useCurrentUser();
  const [showCreate, setShowCreate] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [filter, setFilter] = useState("active");
  const [catalogBootstrapped, setCatalogBootstrapped] = useState(false);

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
  const recipesQuery = useEntityQuery(
    "recipes",
    () => base44.entities.Recipe.filter({ is_available: true }, "name", 100),
    { subscribeEntities: ["Recipe"] }
  );
  const { data: recipes = [] } = recipesQuery;

  useEffect(() => {
    if (!user?.email || catalogBootstrapped || recipesQuery.isLoading || recipesQuery.isError || recipes.length > 0) {
      return;
    }

    let cancelled = false;

    const ensureCatalog = async () => {
      try {
        await base44.functions.invoke("craftingOps", { action: "ensure_catalog" });
        if (!cancelled) {
          setCatalogBootstrapped(true);
          recipesQuery.refetch();
        }
      } catch {
        if (!cancelled) {
          setCatalogBootstrapped(true);
        }
      }
    };

    ensureCatalog();

    return () => {
      cancelled = true;
    };
  }, [
    user?.email,
    catalogBootstrapped,
    recipes.length,
    recipesQuery.isLoading,
    recipesQuery.isError,
    recipesQuery.refetch,
  ]);

  if (loading) {
    return (
      <PageShell title="Workbench" subtitle="Track materials, plan builds, and source what you need">
        <AuthLoadingState message="LOADING WORKBENCH..." />
      </PageShell>
    );
  }

  if (projectsQuery.isLoading && !projectsQuery.data) {
    return (
      <PageShell title="Workbench" subtitle="Track materials, plan builds, and source what you need">
        <StatusStripSkeleton count={4} />
        <SkeletonGrid count={4} variant="project" />
      </PageShell>
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
    { label: "ACTIVE", value: activeProjects.length, color: "text-primary" },
    { label: "MATERIALS", value: `${totalGathered}/${totalMaterialsNeeded}`, color: "text-accent" },
    { label: "READY", value: projects.filter(p => p.status === "ready").length, color: "text-status-ok" },
    { label: "COMPLETED", value: completedProjects.filter(p => p.status === "completed").length, color: "text-foreground" },
  ];

  const filterTabs = [
    { key: "active", label: "Active", icon: Clock, count: activeProjects.length },
    { key: "completed", label: "Completed", icon: CheckCircle, count: completedProjects.length },
    { key: "all", label: "All", icon: Package, count: projects.length },
  ];

  return (
    <PageShell
      title="Workbench"
      subtitle="Plan builds, track gathered materials, and know when you're ready to craft"
      syncMeta={craftingSyncMeta}
      onRetry={() => projectsQuery.refetch()}
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

      {/* Blocked project hint: if any active projects have incomplete materials, suggest trading */}
      {activeProjects.length > 0 && totalGathered < totalMaterialsNeeded && (
        <NextStepBanner
          to="/trade"
          icon={ArrowLeftRight}
          label="Missing materials?"
          hint={`${totalMaterialsNeeded - totalGathered} material${(totalMaterialsNeeded - totalGathered) !== 1 ? "s" : ""} still needed — check the Trade Hub or scavenge runs.`}
          color="accent"
        />
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
