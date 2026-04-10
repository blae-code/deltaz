import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Package, Briefcase } from "lucide-react";
import {
  buildTradeLineItemFromCatalog,
  buildTradeLineItemFromInventory,
  matchGameItemByName,
} from "@/lib/gameCatalog";

function mergeLineItems(items, nextItem) {
  const existingIndex = items.findIndex((entry) => {
    if (entry.inventory_item_id && nextItem.inventory_item_id) {
      return entry.inventory_item_id === nextItem.inventory_item_id;
    }
    if (entry.game_item_slug && nextItem.game_item_slug) {
      return entry.game_item_slug === nextItem.game_item_slug;
    }
    return entry.name === nextItem.name;
  });

  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((entry, index) => (
    index === existingIndex
      ? { ...entry, quantity: (entry.quantity || 1) + (nextItem.quantity || 1) }
      : entry
  ));
}

export default function TradeLineItemsEditor({
  label,
  catalog = [],
  inventory = [],
  value = [],
  onChange,
  allowInventory = false,
  emptyLabel = "No items added.",
}) {
  const [catalogName, setCatalogName] = useState("");
  const [catalogQty, setCatalogQty] = useState(1);
  const [inventoryId, setInventoryId] = useState("none");
  const [inventoryQty, setInventoryQty] = useState(1);

  const matchedCatalogItem = useMemo(
    () => matchGameItemByName(catalog, catalogName),
    [catalog, catalogName],
  );
  const listId = useMemo(
    () => `trade-line-items-${String(label || "items").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    [label],
  );
  const selectedInventoryItem = useMemo(
    () => inventory.find((item) => item.id === inventoryId) || null,
    [inventory, inventoryId],
  );

  const addCatalogItem = () => {
    if (!matchedCatalogItem) {
      return;
    }

    onChange?.(mergeLineItems(
      Array.isArray(value) ? value : [],
      buildTradeLineItemFromCatalog(matchedCatalogItem, catalogQty),
    ));
    setCatalogName("");
    setCatalogQty(1);
  };

  const addInventoryItem = () => {
    if (!selectedInventoryItem) {
      return;
    }

    onChange?.(mergeLineItems(
      Array.isArray(value) ? value : [],
      buildTradeLineItemFromInventory(selectedInventoryItem, inventoryQty, catalog),
    ));
    setInventoryId("none");
    setInventoryQty(1);
  };

  const updateLine = (index, field, nextValue) => {
    onChange?.((Array.isArray(value) ? value : []).map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: nextValue } : item
    )));
  };

  const removeLine = (index) => {
    onChange?.((Array.isArray(value) ? value : []).filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </Label>

      {allowInventory && (
        <div className="grid grid-cols-[1fr_72px_84px] gap-2 items-end">
          <div className="space-y-1">
            <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Add From Locker</div>
            <Select value={inventoryId} onValueChange={setInventoryId}>
              <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono">
                <SelectValue placeholder="Select owned item..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {inventory.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} x{item.quantity || 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Qty</div>
            <Input
              type="number"
              min={1}
              max={selectedInventoryItem?.quantity || 1}
              value={inventoryQty}
              onChange={(event) => setInventoryQty(Math.max(1, parseInt(event.target.value, 10) || 1))}
              className="h-7 text-[10px] bg-secondary/50 border-border font-mono"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addInventoryItem}
            disabled={!selectedInventoryItem}
            className="h-7 text-[10px] font-mono uppercase tracking-wider"
          >
            <Briefcase className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[1fr_72px_84px] gap-2 items-end">
        <div className="space-y-1">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Add Catalog Item</div>
          <Input
            value={catalogName}
            onChange={(event) => setCatalogName(event.target.value)}
            list={listId}
            placeholder="Search catalog..."
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono"
          />
          <datalist id={listId}>
            {catalog.map((item) => (
              <option key={item.id || item.slug} value={item.name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Qty</div>
          <Input
            type="number"
            min={1}
            value={catalogQty}
            onChange={(event) => setCatalogQty(Math.max(1, parseInt(event.target.value, 10) || 1))}
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCatalogItem}
          disabled={!matchedCatalogItem}
          className="h-7 text-[10px] font-mono uppercase tracking-wider"
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      <div className="border border-border/60 rounded-sm divide-y divide-border/50 bg-secondary/15">
        {(Array.isArray(value) ? value : []).length === 0 && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground font-mono italic">
            {emptyLabel}
          </div>
        )}
        {(Array.isArray(value) ? value : []).map((item, index) => (
          <div key={`${item.inventory_item_id || item.game_item_slug || item.name}-${index}`} className="grid grid-cols-[1fr_72px_48px] gap-2 items-center px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] font-mono text-foreground truncate">{item.name}</span>
                {item.game_item_slug && (
                  <Badge variant="outline" className="text-[7px] border-primary/30 text-primary shrink-0">
                    CATALOG
                  </Badge>
                )}
                {item.inventory_item_id && (
                  <Badge variant="outline" className="text-[7px] border-accent/30 text-accent shrink-0">
                    LOCKER
                  </Badge>
                )}
              </div>
            </div>
            <Input
              type="number"
              min={1}
              value={item.quantity || 1}
              onChange={(event) => updateLine(index, "quantity", Math.max(1, parseInt(event.target.value, 10) || 1))}
              className="h-6 text-[10px] bg-secondary/50 border-border font-mono"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLine(index)}
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
