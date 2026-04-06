import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_FILTERS = ["all", "available", "in_progress", "completed", "failed"];
const TYPE_FILTERS = ["all", "recon", "extraction", "sabotage", "escort", "scavenge", "elimination"];

export default function MissionFilters({ statusFilter, typeFilter, factionFilter, factions, onStatusChange, onTypeChange, onFactionChange }) {
  return (
    <div className="flex gap-2 sm:gap-3 flex-wrap items-end">
      {/* Status */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f}
            variant={statusFilter === f ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-8 px-2.5 sm:px-3"
            onClick={() => onStatusChange(f)}
          >
            {f.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Type */}
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="h-8 w-32 text-[11px] bg-muted">
          <SelectValue placeholder="Type..." />
        </SelectTrigger>
        <SelectContent>
          {TYPE_FILTERS.map(t => (
            <SelectItem key={t} value={t}>
              {t === "all" ? "ALL TYPES" : t.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Faction */}
      {factions.length > 0 && (
        <Select value={factionFilter} onValueChange={onFactionChange}>
          <SelectTrigger className="h-8 w-36 text-[11px] bg-muted">
            <SelectValue placeholder="Faction..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL CLANS</SelectItem>
            {factions.map(f => (
              <SelectItem key={f.id} value={f.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                  {f.tag}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}