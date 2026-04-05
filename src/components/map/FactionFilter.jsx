import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function FactionFilter({ factions, selectedFactionId, onSelect }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={selectedFactionId === null ? "default" : "outline"}
        size="sm"
        className="text-[10px] uppercase tracking-wider h-7"
        onClick={() => onSelect(null)}
      >
        ALL FACTIONS
      </Button>
      {factions.map((f) => (
        <Button
          key={f.id}
          variant={selectedFactionId === f.id ? "default" : "outline"}
          size="sm"
          className="text-[10px] uppercase tracking-wider h-7 gap-1.5"
          onClick={() => onSelect(f.id)}
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: f.color || "hsl(var(--primary))" }}
          />
          {f.tag || f.name}
        </Button>
      ))}
    </div>
  );
}