import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "ALL" },
  { value: "rcon_command", label: "RCON" },
  { value: "power_action", label: "POWER" },
  { value: "broadcast", label: "BROADCAST" },
  { value: "status_change", label: "STATUS" },
  { value: "player_event", label: "PLAYER" },
  { value: "system", label: "SYSTEM" },
];

export default function LogFilters({ category, onCategoryChange, search, onSearchChange }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={category === cat.value ? "default" : "outline"}
            size="sm"
            className="h-6 text-[9px] tracking-wider px-2"
            onClick={() => onCategoryChange(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search logs..."
          className="h-6 text-[10px] pl-7 bg-secondary/50"
        />
      </div>
    </div>
  );
}