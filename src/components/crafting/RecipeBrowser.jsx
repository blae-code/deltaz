import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hammer, Search, Plus, Check, X, BookOpen } from "lucide-react";
import EmptyState from "../terminal/EmptyState";
import GuidanceBox from "../terminal/GuidanceBox";
import { useToast } from "@/components/ui/use-toast";

const diffColor = {
  basic: "text-primary",
  intermediate: "text-accent",
  advanced: "text-status-warn",
  masterwork: "text-status-danger",
};

export default function RecipeBrowser({ recipes, inventory, userEmail, onProjectCreated }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categories = ["all", ...new Set(recipes.map(r => r.category))];

  const filtered = recipes.filter(r => {
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getInventoryCount = (resourceName) => {
    if (!resourceName) return 0;
    const lower = resourceName.toLowerCase();
    return inventory
      .filter(i => i.name && i.name.toLowerCase().includes(lower))
      .reduce((sum, i) => sum + (i.quantity || 1), 0);
  };

  const startProject = async (recipe) => {
    await base44.entities.CraftingProject.create({
      owner_email: userEmail,
      title: recipe.name,
      description: recipe.description || "",
      recipe_id: recipe.id,
      category: recipe.category || "custom",
      priority: "normal",
      status: "gathering",
      materials: (recipe.ingredients || []).map(ing => ({
        resource: ing.resource,
        needed: ing.amount,
        have: 0,
      })),
    });
    toast({ title: "Project Created", description: `"${recipe.name}" added to workbench` });
    queryClient.invalidateQueries({ queryKey: ["craftingProjects"] });
    onProjectCreated?.();
  };

  return (
    <DataCard title="Recipe Catalogue">
      <div className="space-y-3">
        {/* Search & filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="h-7 text-[10px] bg-secondary/50 border-border font-mono pl-7"
            />
          </div>
          <div className="flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-sm ${
                  catFilter === cat ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground border border-transparent hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe list */}
        {filtered.length === 0 && (
          <div className="py-4">
            <GuidanceBox icon={Search} title="No Matching Recipes" color="muted">
              {search ? `No recipes match "${search}".` : `No recipes in the "${catFilter}" category.`}
              {" "}Try adjusting your search or filter, or create a custom project instead.
            </GuidanceBox>
          </div>
        )}

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filtered.map(recipe => {
            const ingredients = recipe.ingredients || [];
            const canCraft = ingredients.every(ing => getInventoryCount(ing.resource) >= ing.amount);

            return (
              <div key={recipe.id} className="border border-border bg-secondary/20 rounded-sm p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold font-mono text-foreground">{recipe.name}</span>
                      {recipe.difficulty && (
                        <span className={`text-[10px] font-mono uppercase tracking-wider ${diffColor[recipe.difficulty] || "text-muted-foreground"}`}>
                          {recipe.difficulty}
                        </span>
                      )}
                      {recipe.category && (
                        <span className="text-[10px] text-muted-foreground uppercase">{recipe.category}</span>
                      )}
                    </div>
                    {recipe.description && (
                      <p className="text-[9px] text-muted-foreground italic mt-0.5">{recipe.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={canCraft ? "default" : "outline"}
                    onClick={() => startProject(recipe)}
                    className="h-6 text-[10px] font-mono uppercase tracking-wider shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> TRACK
                  </Button>
                </div>

                {/* Ingredients */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ingredients.map((ing, idx) => {
                    const invCount = getInventoryCount(ing.resource);
                    const hasEnough = invCount >= ing.amount;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
                          hasEnough ? "border-status-ok/30 bg-status-ok/5 text-status-ok" : "border-border bg-secondary/30 text-muted-foreground"
                        }`}
                      >
                        {hasEnough ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5 text-destructive/50" />}
                        <span>{ing.amount}x {ing.resource || "???"}</span>
                        <span className="text-[10px] opacity-60">({invCount})</span>
                      </div>
                    );
                  })}
                </div>

                {recipe.bonus_type && recipe.bonus_type !== "none" && (
                  <div className="mt-1.5 text-[10px] text-chart-4 font-mono">
                    +{recipe.bonus_value || 0}% {recipe.bonus_type} • Value: {recipe.output_value || 0}c
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DataCard>
  );
}