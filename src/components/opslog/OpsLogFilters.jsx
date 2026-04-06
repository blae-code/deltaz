import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, RefreshCw } from "lucide-react";

const EVENT_TYPES = [
  { value: "all", label: "ALL TYPES" },
  { value: "combat_kill", label: "Kill" },
  { value: "combat_death", label: "Death" },
  { value: "combat_raid", label: "Raid" },
  { value: "base_breach", label: "Base Breach" },
  { value: "territory_capture", label: "Territory Capture" },
  { value: "territory_lost", label: "Territory Lost" },
  { value: "mission_accepted", label: "Mission Accepted" },
  { value: "mission_completed", label: "Mission Completed" },
  { value: "mission_failed", label: "Mission Failed" },
  { value: "mission_abandoned", label: "Mission Abandoned" },
  { value: "trade_completed", label: "Trade Completed" },
  { value: "diplomacy_change", label: "Diplomacy Change" },
  { value: "player_join", label: "Player Join" },
  { value: "player_leave", label: "Player Leave" },
  { value: "airdrop", label: "Airdrop" },
  { value: "explosion", label: "Explosion" },
  { value: "vehicle_destroyed", label: "Vehicle Destroyed" },
  { value: "custom", label: "Custom" },
];

const SEVERITIES = [
  { value: "all", label: "ALL" },
  { value: "routine", label: "Routine" },
  { value: "notable", label: "Notable" },
  { value: "critical", label: "Critical" },
  { value: "emergency", label: "Emergency" },
];

export default function OpsLogFilters({
  filters,
  onFilterChange,
  factions,
  sectors,
  missions,
  onRefresh,
  isFetching,
}) {
  const update = (key, val) => onFilterChange({ ...filters, [key]: val });

  const hasFilters =
    filters.search ||
    filters.event_type !== "all" ||
    filters.severity !== "all" ||
    filters.faction_id !== "all" ||
    filters.sector !== "all" ||
    filters.mission_id !== "all";

  const clearAll = () =>
    onFilterChange({
      search: "",
      event_type: "all",
      severity: "all",
      faction_id: "all",
      sector: "all",
      mission_id: "all",
    });

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search logs by title, player, detail..."
            className="pl-8 h-8 text-xs bg-secondary/50"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[10px] text-muted-foreground shrink-0"
            onClick={clearAll}
          >
            <X className="h-3 w-3 mr-1" /> CLEAR
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex gap-1.5 flex-wrap">
        <Select value={filters.event_type} onValueChange={(v) => update("event_type", v)}>
          <SelectTrigger className="h-7 text-[10px] w-[140px] bg-secondary/50">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-[10px]">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.severity} onValueChange={(v) => update("severity", v)}>
          <SelectTrigger className="h-7 text-[10px] w-[110px] bg-secondary/50">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-[10px]">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.faction_id} onValueChange={(v) => update("faction_id", v)}>
          <SelectTrigger className="h-7 text-[10px] w-[130px] bg-secondary/50">
            <SelectValue placeholder="Clan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px]">ALL CLANS</SelectItem>
            {(factions || []).map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-[10px]">
                {f.tag} {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sector} onValueChange={(v) => update("sector", v)}>
          <SelectTrigger className="h-7 text-[10px] w-[110px] bg-secondary/50">
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px]">ALL SECTORS</SelectItem>
            {(sectors || []).map((s) => (
              <SelectItem key={s} value={s} className="text-[10px]">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.mission_id} onValueChange={(v) => update("mission_id", v)}>
          <SelectTrigger className="h-7 text-[10px] w-[160px] bg-secondary/50">
            <SelectValue placeholder="Mission" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px]">ALL MISSIONS</SelectItem>
            {(missions || []).map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-[10px]">
                {m.title?.slice(0, 30)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}