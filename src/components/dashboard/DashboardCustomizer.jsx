import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, RotateCcw } from "lucide-react";
import WIDGET_REGISTRY, { DEFAULT_LAYOUT } from "./WidgetRegistry";

export default function DashboardCustomizer({ layout, onSave, onClose }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(layout)));

  const toggle = (id) => {
    setDraft((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const reset = () => setDraft(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)));

  const save = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div className="border border-primary/30 bg-card rounded-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-primary/5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          Customize Dashboard
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        <p className="text-[10px] text-muted-foreground mb-2">
          Toggle widgets on/off. Use drag handles on the dashboard to reorder. Use resize buttons to change size.
        </p>
        {draft.map((item) => {
          const reg = WIDGET_REGISTRY.find((w) => w.id === item.id);
          if (!reg) return null;
          const Icon = reg.icon;
          return (
            <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-border/40">
              <Switch
                checked={item.visible}
                onCheckedChange={() => toggle(item.id)}
                className="scale-75"
              />
              <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-foreground font-mono flex-1">{reg.label}</span>
              <span className="text-[9px] text-muted-foreground uppercase">{item.size}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <Button variant="ghost" size="sm" className="h-7 text-[9px] text-muted-foreground" onClick={reset}>
          <RotateCcw className="h-3 w-3 mr-1" /> RESET
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[9px]" onClick={onClose}>
            CANCEL
          </Button>
          <Button size="sm" className="h-7 text-[9px]" onClick={save}>
            SAVE LAYOUT
          </Button>
        </div>
      </div>
    </div>
  );
}