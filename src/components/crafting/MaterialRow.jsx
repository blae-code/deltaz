import { Input } from "@/components/ui/input";
import { Check, Minus } from "lucide-react";

export default function MaterialRow({ mat, idx, editing, inventoryCount, onUpdate }) {
  const have = mat.have || 0;
  const needed = mat.needed || 1;
  const complete = have >= needed;
  const inInventory = inventoryCount > 0;

  return (
    <div className={`grid grid-cols-[1fr_60px_60px_50px] gap-1.5 items-center px-0.5 py-0.5 rounded-sm ${
      complete ? "bg-status-ok/5" : ""
    }`}>
      {/* Resource name */}
      <div className="flex items-center gap-1.5">
        <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
          complete
            ? "border-status-ok bg-status-ok/20"
            : "border-border"
        }`}>
          {complete && <Check className="h-2.5 w-2.5 text-status-ok" />}
        </div>
        <span className={`text-[10px] font-mono truncate ${complete ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {mat.resource}
        </span>
      </div>

      {/* Needed */}
      <span className="text-[10px] font-mono text-muted-foreground text-center">{needed}</span>

      {/* Have — editable or static */}
      {editing ? (
        <Input
          type="number"
          min={0}
          value={have}
          onChange={e => onUpdate(idx, "have", parseInt(e.target.value) || 0)}
          className="h-5 text-[10px] bg-secondary/50 border-border font-mono text-center px-1"
        />
      ) : (
        <span className={`text-[10px] font-mono text-center font-semibold ${
          complete ? "text-status-ok" : have > 0 ? "text-accent" : "text-destructive/70"
        }`}>
          {have}
        </span>
      )}

      {/* Inventory hint */}
      <span className={`text-[9px] font-mono text-center ${inInventory ? "text-chart-4" : "text-muted-foreground/40"}`}>
        {inInventory ? inventoryCount : "—"}
      </span>
    </div>
  );
}