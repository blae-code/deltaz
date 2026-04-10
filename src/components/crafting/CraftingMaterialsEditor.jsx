import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package } from "lucide-react";
import { matchGameItemByName } from "@/lib/gameCatalog";

function mergeMaterials(materials, nextMaterial) {
  const existingIndex = materials.findIndex((entry) => {
    if (entry.game_item_slug && nextMaterial.game_item_slug) {
      return entry.game_item_slug === nextMaterial.game_item_slug;
    }
    return entry.resource === nextMaterial.resource;
  });

  if (existingIndex === -1) {
    return [...materials, nextMaterial];
  }

  return materials.map((entry, index) => (
    index === existingIndex
      ? { ...entry, needed: (entry.needed || 1) + (nextMaterial.needed || 1) }
      : entry
  ));
}

export default function CraftingMaterialsEditor({
  catalog = [],
  value = [],
  onChange,
}) {
  const [catalogName, setCatalogName] = useState("");
  const [needed, setNeeded] = useState(1);
  const matchedCatalogItem = useMemo(
    () => matchGameItemByName(catalog, catalogName),
    [catalog, catalogName],
  );

  const addMaterial = () => {
    if (!matchedCatalogItem) {
      return;
    }

    onChange?.(mergeMaterials(
      Array.isArray(value) ? value : [],
      {
        resource: matchedCatalogItem.name,
        game_item_slug: matchedCatalogItem.slug,
        needed: Math.max(1, needed),
        have: 0,
      },
    ));
    setCatalogName("");
    setNeeded(1);
  };

  const updateMaterial = (index, field, nextValue) => {
    onChange?.((Array.isArray(value) ? value : []).map((material, materialIndex) => (
      materialIndex === index ? { ...material, [field]: nextValue } : material
    )));
  };

  const removeMaterial = (index) => {
    onChange?.((Array.isArray(value) ? value : []).filter((_, materialIndex) => materialIndex !== index));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_72px_84px] gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
            Add Catalog Material
          </Label>
          <Input
            value={catalogName}
            onChange={(event) => setCatalogName(event.target.value)}
            list="crafting-material-catalog"
            placeholder="Search material..."
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono"
          />
          <datalist id="crafting-material-catalog">
            {catalog.map((item) => (
              <option key={item.id || item.slug} value={item.name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
            Need
          </Label>
          <Input
            type="number"
            min={1}
            value={needed}
            onChange={(event) => setNeeded(Math.max(1, parseInt(event.target.value, 10) || 1))}
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addMaterial}
          disabled={!matchedCatalogItem}
          className="h-7 text-[10px] font-mono uppercase tracking-wider"
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      <div className="border border-border/60 rounded-sm divide-y divide-border/50 bg-secondary/15">
        {(Array.isArray(value) ? value : []).length === 0 && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground font-mono italic">
            No materials selected.
          </div>
        )}
        {(Array.isArray(value) ? value : []).map((material, index) => (
          <div key={`${material.game_item_slug || material.resource}-${index}`} className="grid grid-cols-[1fr_72px_72px_48px] gap-2 items-center px-3 py-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Package className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-mono text-foreground truncate">{material.resource}</span>
            </div>
            <Input
              type="number"
              min={1}
              value={material.needed || 1}
              onChange={(event) => updateMaterial(index, "needed", Math.max(1, parseInt(event.target.value, 10) || 1))}
              className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
            />
            <Input
              type="number"
              min={0}
              value={material.have || 0}
              onChange={(event) => updateMaterial(index, "have", Math.max(0, parseInt(event.target.value, 10) || 0))}
              className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeMaterial(index)}
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
