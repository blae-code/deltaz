import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Hammer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = ["weapon", "armor", "tool", "consumable", "upgrade", "trade_good", "building", "custom"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

export default function CreateProjectForm({ userEmail, recipes, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [priority, setPriority] = useState("normal");
  const [recipeId, setRecipeId] = useState("");
  const [materials, setMaterials] = useState([{ resource: "", needed: 1, have: 0 }]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadFromRecipe = (id) => {
    setRecipeId(id);
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    setTitle(recipe.name);
    setDescription(recipe.description || "");
    setCategory(recipe.category || "custom");
    setMaterials(
      (recipe.ingredients || []).map(ing => ({
        resource: ing.resource,
        needed: ing.amount,
        have: 0,
      }))
    );
  };

  const updateMaterial = (idx, field, value) => {
    setMaterials(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addMaterial = () => setMaterials(prev => [...prev, { resource: "", needed: 1, have: 0 }]);
  const removeMaterial = (idx) => setMaterials(prev => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || materials.length === 0) return;

    const cleanMats = materials.filter(m => m.resource.trim()).map(m => ({
      resource: m.resource.trim(),
      needed: Math.max(1, m.needed),
      have: Math.max(0, m.have),
    }));

    if (cleanMats.length === 0) {
      toast({ title: "Error", description: "Add at least one material", variant: "destructive" });
      return;
    }

    setSaving(true);
    await base44.entities.CraftingProject.create({
      owner_email: userEmail,
      title: title.trim(),
      description: description.trim(),
      recipe_id: recipeId || undefined,
      category,
      priority,
      status: "gathering",
      materials: cleanMats,
    });

    toast({ title: "Project Created", description: `"${title}" added to workbench` });
    setSaving(false);
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Recipe shortcut */}
      {recipes.length > 0 && (
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
            Load from Recipe (optional)
          </Label>
          <Select value={recipeId} onValueChange={loadFromRecipe}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5">
              <SelectValue placeholder="Choose a recipe to auto-fill..." />
            </SelectTrigger>
            <SelectContent>
              {recipes.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.category}) — {r.difficulty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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

      {/* Materials list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
            Materials Needed
          </Label>
          <Button type="button" variant="ghost" size="sm" onClick={addMaterial} className="h-5 text-[9px] text-primary">
            <Plus className="h-3 w-3 mr-0.5" /> ADD
          </Button>
        </div>
        <div className="space-y-1.5">
          {materials.map((mat, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_70px_70px_28px] gap-1.5 items-center">
              <Input
                value={mat.resource}
                onChange={e => updateMaterial(idx, "resource", e.target.value)}
                placeholder="Resource name"
                className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
              />
              <Input
                type="number"
                min={1}
                value={mat.needed}
                onChange={e => updateMaterial(idx, "needed", parseInt(e.target.value) || 1)}
                className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
                title="Needed"
              />
              <Input
                type="number"
                min={0}
                value={mat.have}
                onChange={e => updateMaterial(idx, "have", parseInt(e.target.value) || 0)}
                className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
                title="Have"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removeMaterial(idx)}
                disabled={materials.length <= 1}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_70px_70px_28px] gap-1.5 text-[8px] text-muted-foreground/60 uppercase tracking-wider font-mono px-0.5">
            <span>Resource</span><span>Need</span><span>Have</span><span></span>
          </div>
        </div>
      </div>

      <Button type="submit" size="sm" disabled={saving || !title.trim()} className="w-full font-mono text-[10px] uppercase tracking-wider h-7">
        <Hammer className="h-3 w-3 mr-1" /> {saving ? "CREATING..." : "CREATE PROJECT"}
      </Button>
    </form>
  );
}