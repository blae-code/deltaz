import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const METRICS = [
  { key: "food_reserves", label: "Food Reserves" },
  { key: "morale", label: "Morale" },
  { key: "defense_integrity", label: "Defense Integrity" },
  { key: "water_supply", label: "Water Supply" },
  { key: "medical_supplies", label: "Medical Supplies" },
  { key: "power_level", label: "Power Level" },
  { key: "population", label: "Population", max: 999 },
];

export default function ColonyMetricEditor({ colony, onUpdated }) {
  const [values, setValues] = useState(() => {
    const v = {};
    METRICS.forEach(m => { v[m.key] = colony[m.key] ?? 100; });
    v.threat_level = colony.threat_level || "minimal";
    v.last_incident = colony.last_incident || "";
    v.gm_notes = colony.gm_notes || "";
    return v;
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const update = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    await base44.entities.ColonyStatus.update(colony.id, values);
    toast({ title: "Colony metrics updated" });
    onUpdated?.();
    setSaving(false);
  };

  return (
    <div className="space-y-3 border border-border rounded-sm p-3 bg-secondary/20">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {METRICS.map(m => (
          <div key={m.key}>
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">{m.label}</Label>
            <Input
              type="number"
              min={0}
              max={m.max || 100}
              value={values[m.key]}
              onChange={(e) => update(m.key, parseInt(e.target.value) || 0)}
              className="h-7 text-xs bg-card border-border font-mono mt-0.5"
            />
          </div>
        ))}
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Threat Level</Label>
        <Select value={values.threat_level} onValueChange={(v) => update("threat_level", v)}>
          <SelectTrigger className="h-7 text-[10px] bg-card border-border font-mono mt-0.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["minimal", "low", "moderate", "high", "critical"].map(t => (
              <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Last Incident</Label>
        <Input
          value={values.last_incident}
          onChange={(e) => update("last_incident", e.target.value)}
          placeholder="Describe last incident..."
          className="h-7 text-xs bg-card border-border font-mono mt-0.5"
        />
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">GM Notes</Label>
        <Textarea
          value={values.gm_notes}
          onChange={(e) => update("gm_notes", e.target.value)}
          placeholder="Internal notes..."
          className="text-xs bg-card border-border font-mono min-h-[40px] mt-0.5"
          rows={2}
        />
      </div>

      <Button onClick={save} disabled={saving} size="sm" className="w-full font-mono text-[10px] uppercase tracking-wider h-7">
        {saving ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> SAVING...</> : <><Save className="h-3 w-3 mr-1.5" /> UPDATE METRICS</>}
      </Button>
    </div>
  );
}