import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hammer, BookOpen } from "lucide-react";
import GuidanceBox from "../terminal/GuidanceBox";
import { useToast } from "@/components/ui/use-toast";
import useGameCatalog from "@/hooks/useGameCatalog";
import CraftingMaterialsEditor from "./CraftingMaterialsEditor";

const CATEGORIES = ["weapon", "ammo", "armor", "clothing", "backpack", "tool", "medical", "consumable", "material", "upgrade", "trade_good", "building", "custom"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

// SAFETY: Creates CraftingProject records.
// Schema requires: owner_email, title, materials (array of {resource, needed, have}).
// Category enum includes weapon/ammo/armor/clothing/backpack/tool/medical/consumable/material/upgrade/trade_good/building/custom.
// Priority enum: low|normal|high|urgent. Status enum: gathering|ready|completed|abandoned.
// TODO(schema-audit): custom/building remain project-only convenience categories.
export default function CreateProjectForm({ userEmail: _userEmail, recipes: rawRecipes, onCreated }) {
  const recipes = Array.isArray(rawRecipes) ? rawRecipes : [];
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [priority, setPriority] = useState("normal");
  const [recipeId, setRecipeId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { data: gameItems = [] } = useGameCatalog();

  const loadFromRecipe = (id) => {
    setRecipeId(id);
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    setTitle(recipe.name || "");
    setDescription(recipe.description || "");
    // Recipe.category may not include all CraftingProject categories — fallback to "custom"
    setCategory(CATEGORIES.includes(recipe.category) ? recipe.category : "custom");
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    setMaterials(
      ingredients.map(ing => ({
        resource: ing?.resource || "",
        game_item_slug: ing?.item_slug || "",
        needed: ing?.amount || 1,
        have: 0,
      }))
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || materials.length === 0) return;

    const cleanMats = materials.filter(m => m.resource.trim()).map(m => ({
      resource: m.resource.trim(),
      game_item_slug: m.game_item_slug || "",
      needed: Math.max(1, m.needed),
      have: Math.max(0, m.have),
    }));

    if (cleanMats.length === 0) {
      toast({ title: "Error", description: "Add at least one material", variant: "destructive" });
      return;
    }

    setSaving(true);
    await base44.functions.invoke("craftingOps", {
      action: "create_project",
      title: title.trim(),
      description: description.trim(),
      recipe_id: recipeId || undefined,
      category,
      priority,
      status: "gathering",
      materials: cleanMats,
    });

    toast({ title: "Project Created", description: `"${title}" added to workbench` });
    queryClient.invalidateQueries({ queryKey: ["craftingProjects"] });
    setSaving(false);
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Recipe shortcut */}
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          Load from Recipe (optional)
        </Label>
        {recipes.length > 0 ? (
          <Select value={recipeId} onValueChange={loadFromRecipe}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5">
              <SelectValue placeholder="Choose a recipe to auto-fill..." />
            </SelectTrigger>
            <SelectContent>
              {recipes.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name || "Unnamed Recipe"} ({r.category || "custom"}) — {r.difficulty || "unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <GuidanceBox icon={BookOpen} title="No Recipes Loaded" color="muted">
            The recipe catalogue is empty — define your own materials below. Recipes will auto-fill when your GM adds them.
          </GuidanceBox>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Project Title</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Build Compound Bow"
            required
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Notes (optional)</Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Where to find materials, who to trade with..."
          className="text-[10px] bg-secondary/50 border-border font-mono mt-0.5 min-h-[40px]"
          rows={2}
        />
      </div>

      <CraftingMaterialsEditor catalog={gameItems} value={materials} onChange={setMaterials} />

      <Button type="submit" size="sm" disabled={saving || !title.trim()} className="w-full font-mono text-[10px] uppercase tracking-wider h-7">
        <Hammer className="h-3 w-3 mr-1" /> {saving ? "CREATING..." : "CREATE PROJECT"}
      </Button>
    </form>
  );
}
