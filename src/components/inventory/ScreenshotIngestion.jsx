import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Loader2, Check, X, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = ["weapon", "armor", "tool", "consumable", "material", "ammo", "misc"];

export default function ScreenshotIngestion({ userEmail, onComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsedItems(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const parseScreenshot = async () => {
    if (!file) return;
    setParsing(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an inventory parser for a post-apocalyptic survival game. Analyze this screenshot of a player's inventory screen. Extract every item you can see. For each item determine:
- name: the item name exactly as shown
- category: one of: weapon, armor, tool, consumable, material, ammo, misc
- quantity: number visible (default 1 if not shown)
- rarity: one of: common, uncommon, rare, epic, legendary (infer from color coding or text, default common)
- value: estimated credit value (0 if unknown)
- condition: durability 0-100 if visible (default 100)

Be thorough — extract ALL visible items even if partially obscured.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string", enum: CATEGORIES },
                quantity: { type: "number" },
                rarity: { type: "string", enum: ["common", "uncommon", "rare", "epic", "legendary"] },
                value: { type: "number" },
                condition: { type: "number" },
              },
              required: ["name", "category"],
            },
          },
          notes: { type: "string" },
        },
        required: ["items"],
      },
    });
    setParsedItems(result);
    setParsing(false);
  };

  const removeItem = (idx) => {
    setParsedItems((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const saveAll = async () => {
    if (!parsedItems?.items?.length) return;
    setSaving(true);
    const records = parsedItems.items.map((item) => ({
      owner_email: userEmail,
      name: item.name,
      category: item.category || "misc",
      rarity: item.rarity || "common",
      quantity: Math.max(1, item.quantity || 1),
      value: item.value || 0,
      condition: item.condition || 100,
      source: "screenshot scan",
    }));
    await base44.entities.InventoryItem.bulkCreate(records);
    toast({ title: "Inventory Imported", description: `${records.length} items added from screenshot` });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    setSaving(false);
    setParsedItems(null);
    setFile(null);
    setPreview(null);
    onComplete?.();
  };

  const rarityColor = {
    common: "text-muted-foreground",
    uncommon: "text-status-ok",
    rare: "text-chart-4",
    epic: "text-chart-5",
    legendary: "text-accent",
  };

  return (
    <div className="space-y-3">
      {/* Upload area */}
      {!parsedItems && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          {!preview ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-sm p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-mono tracking-wider">
                UPLOAD INVENTORY SCREENSHOT
              </span>
              <span className="text-[9px] text-muted-foreground/60">
                PNG, JPG — game inventory screen
              </span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="relative border border-border rounded-sm overflow-hidden">
                <img src={preview} alt="Screenshot" className="w-full max-h-48 object-contain bg-black/50" />
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-1 right-1 p-1 rounded-sm bg-background/80 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <Button
                onClick={parseScreenshot}
                disabled={parsing}
                className="w-full font-mono text-[10px] uppercase tracking-wider h-7"
                size="sm"
              >
                {parsing ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> SCANNING ITEMS...</>
                ) : (
                  <><Upload className="h-3 w-3 mr-1" /> PARSE SCREENSHOT</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Parsed results */}
      {parsedItems && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-primary tracking-widest uppercase font-semibold">
              {parsedItems.items.length} ITEMS DETECTED
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[9px]"
              onClick={() => { setParsedItems(null); setFile(null); setPreview(null); }}
            >
              RESCAN
            </Button>
          </div>

          {parsedItems.notes && (
            <p className="text-[9px] text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              {parsedItems.notes}
            </p>
          )}

          <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-sm">
            {parsedItems.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 text-[10px] hover:bg-secondary/20"
              >
                <span className={`font-semibold flex-1 min-w-0 truncate ${rarityColor[item.rarity] || ""}`}>
                  {item.name}
                </span>
                <Badge variant="outline" className="text-[8px] shrink-0">{item.category?.toUpperCase()}</Badge>
                <span className="text-muted-foreground w-8 text-right shrink-0">×{item.quantity || 1}</span>
                <span className="text-accent w-10 text-right shrink-0">{item.value || 0}c</span>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive shrink-0 p-0.5">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <Button
            onClick={saveAll}
            disabled={saving || parsedItems.items.length === 0}
            className="w-full font-mono text-[10px] uppercase tracking-wider h-8"
            size="sm"
          >
            {saving ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> IMPORTING...</>
            ) : (
              <><Check className="h-3 w-3 mr-1" /> IMPORT {parsedItems.items.length} ITEMS</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}