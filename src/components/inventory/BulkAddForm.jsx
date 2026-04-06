import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = ["weapon", "armor", "tool", "consumable", "material", "ammo", "misc"];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

function emptyRow() {
  return { name: "", category: "misc", rarity: "common", quantity: 1, value: 0 };
}

export default function BulkAddForm({ userEmail, onComplete }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("rows"); // rows | paste
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [pasteText, setPasteText] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const updateRow = (idx, field, val) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  };

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const parsePaste = () => {
    const lines = pasteText.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = lines.map((line) => {
      // Accept: "ItemName, quantity" or "ItemName x5" or just "ItemName"
      const matchQty = line.match(/^(.+?)\s*[,x×]\s*(\d+)$/i);
      if (matchQty) {
        return { name: matchQty[1].trim(), category: "misc", rarity: "common", quantity: parseInt(matchQty[2]) || 1, value: 0 };
      }
      return { name: line, category: "misc", rarity: "common", quantity: 1, value: 0 };
    });
    setRows(parsed);
    setMode("rows");
  };

  const save = async () => {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) return;
    setSaving(true);
    const records = valid.map((r) => ({
      owner_email: userEmail,
      name: r.name.trim(),
      category: r.category,
      rarity: r.rarity,
      quantity: Math.max(1, r.quantity || 1),
      value: r.value || 0,
      condition: 100,
      source: "bulk entry",
    }));
    await base44.entities.InventoryItem.bulkCreate(records);
    toast({ title: "Bulk Add Complete", description: `${records.length} items added` });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    setSaving(false);
    setRows([emptyRow(), emptyRow(), emptyRow()]);
    onComplete?.();
  };

  const validCount = rows.filter((r) => r.name.trim()).length;

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1">
        <Button
          variant={mode === "rows" ? "default" : "outline"}
          size="sm"
          className="h-6 text-[9px] tracking-wider"
          onClick={() => setMode("rows")}
        >
          TABLE
        </Button>
        <Button
          variant={mode === "paste" ? "default" : "outline"}
          size="sm"
          className="h-6 text-[9px] tracking-wider"
          onClick={() => setMode("paste")}
        >
          QUICK PASTE
        </Button>
      </div>

      {mode === "paste" && (
        <div className="space-y-2">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
            Paste item list (one per line, optional: "Item, qty" or "Item x5")
          </Label>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"AK-47 x2\nMedkit, 5\nScrap Metal x10\nCanned Food"}
            rows={5}
            className="font-mono text-xs bg-secondary/50"
          />
          <Button
            onClick={parsePaste}
            disabled={!pasteText.trim()}
            size="sm"
            className="font-mono text-[10px] uppercase tracking-wider h-7"
          >
            PARSE LIST
          </Button>
        </div>
      )}

      {mode === "rows" && (
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-12 gap-1 text-[8px] text-muted-foreground tracking-wider uppercase px-1">
            <div className="col-span-4">NAME</div>
            <div className="col-span-2">CATEGORY</div>
            <div className="col-span-2">RARITY</div>
            <div className="col-span-1">QTY</div>
            <div className="col-span-2">VALUE</div>
            <div className="col-span-1"></div>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1">
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 items-center">
                <input
                  className="col-span-4 h-6 text-[10px] bg-secondary/50 border border-border rounded-sm px-1.5 font-mono"
                  value={row.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                  placeholder="Item name"
                />
                <Select value={row.category} onValueChange={(v) => updateRow(idx, "category", v)}>
                  <SelectTrigger className="col-span-2 h-6 text-[9px] bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={row.rarity} onValueChange={(v) => updateRow(idx, "rarity", v)}>
                  <SelectTrigger className="col-span-2 h-6 text-[9px] bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RARITIES.map((r) => (
                      <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  className="col-span-1 h-6 text-[10px] bg-secondary/50 border border-border rounded-sm px-1 font-mono text-center"
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => updateRow(idx, "quantity", parseInt(e.target.value) || 1)}
                />
                <input
                  className="col-span-2 h-6 text-[10px] bg-secondary/50 border border-border rounded-sm px-1 font-mono text-right"
                  type="number"
                  min={0}
                  value={row.value}
                  onChange={(e) => updateRow(idx, "value", parseInt(e.target.value) || 0)}
                />
                <button
                  onClick={() => removeRow(idx)}
                  className="col-span-1 flex items-center justify-center text-muted-foreground hover:text-destructive h-6"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[9px] text-muted-foreground"
            onClick={addRow}
          >
            <Plus className="h-3 w-3 mr-1" /> ADD ROW
          </Button>
        </div>
      )}

      <Button
        onClick={save}
        disabled={saving || validCount === 0}
        className="w-full font-mono text-[10px] uppercase tracking-wider h-7"
        size="sm"
      >
        {saving ? (
          <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> SAVING...</>
        ) : (
          <><Plus className="h-3 w-3 mr-1" /> ADD {validCount} ITEMS</>
        )}
      </Button>
    </div>
  );
}