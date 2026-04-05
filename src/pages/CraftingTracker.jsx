import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Hammer, BookOpen, Archive } from "lucide-react";
import ProjectList from "../components/crafting/ProjectList";
import CreateProjectForm from "../components/crafting/CreateProjectForm";
import RecipeBrowser from "../components/crafting/RecipeBrowser";

export default function CraftingTracker() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [filter, setFilter] = useState("active"); // active | completed | all

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const [proj, inv, rec] = await Promise.all([
      base44.entities.CraftingProject.filter({ owner_email: u.email }, "-created_date", 100),
      base44.entities.InventoryItem.filter({ owner_email: u.email }, "-created_date", 200),
      base44.entities.Recipe.filter({ is_available: true }, "name", 100),
    ]);
    setProjects(proj);
    setInventory(inv);
    setRecipes(rec);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.CraftingProject.subscribe((event) => {
      if (event.type === "create") setProjects(prev => [event.data, ...prev]);
      else if (event.type === "update") setProjects(prev => prev.map(p => p.id === event.id ? event.data : p));
      else if (event.type === "delete") setProjects(prev => prev.filter(p => p.id !== event.id));
    });
    return unsub;
  }, []);

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Workbench
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Track materials, plan builds, and source what you need
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={showRecipes ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => { setShowRecipes(!showRecipes); setShowCreate(false); }}
          >
            <BookOpen className="h-3 w-3 mr-1" /> RECIPES
          </Button>
          <Button
            variant={showCreate ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => { setShowCreate(!showCreate); setShowRecipes(false); }}
          >
            <Plus className="h-3 w-3 mr-1" /> NEW PROJECT
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border bg-card rounded-sm p-3">
          <div className="text-[9px] text-muted-foreground tracking-widest uppercase">Active Projects</div>
          <div className="text-lg font-bold font-display text-primary">{activeProjects.length}</div>
        </div>
        <div className="border border-border bg-card rounded-sm p-3">
          <div className="text-[9px] text-muted-foreground tracking-widest uppercase">Materials Sourced</div>
          <div className="text-lg font-bold font-display text-accent">{totalGathered}/{totalMaterialsNeeded}</div>
        </div>
        <div className="border border-border bg-card rounded-sm p-3">
          <div className="text-[9px] text-muted-foreground tracking-widest uppercase">Ready to Build</div>
          <div className="text-lg font-bold font-display text-status-ok">{projects.filter(p => p.status === "ready").length}</div>
        </div>
        <div className="border border-border bg-card rounded-sm p-3">
          <div className="text-[9px] text-muted-foreground tracking-widest uppercase">Completed</div>
          <div className="text-lg font-bold font-display text-foreground">{completedProjects.filter(p => p.status === "completed").length}</div>
        </div>
      </div>

      {/* Recipe browser */}
      {showRecipes && (
        <RecipeBrowser
          recipes={recipes}
          inventory={inventory}
          userEmail={user?.email}
          onProjectCreated={() => { loadData(); setShowRecipes(false); }}
        />
      )}

      {/* Create form */}
      {showCreate && (
        <DataCard title="New Crafting Project">
          <CreateProjectForm
            userEmail={user?.email}
            recipes={recipes}
            onCreated={() => { loadData(); setShowCreate(false); }}
          />
        </DataCard>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2">
        {[
          { key: "active", label: "Active", count: activeProjects.length },
          { key: "completed", label: "Completed", count: completedProjects.length },
          { key: "all", label: "All", count: projects.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`text-[9px] uppercase tracking-wider font-mono px-2.5 py-1 rounded-sm transition-colors ${
              filter === t.key
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Project list */}
      <ProjectList
        projects={filteredProjects}
        inventory={inventory}
        userEmail={user?.email}
        userCallsign={user?.callsign || user?.full_name}
        onUpdate={loadData}
      />
    </div>
  );
}