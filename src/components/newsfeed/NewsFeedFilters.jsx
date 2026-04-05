import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { key: "all", label: "ALL" },
  { key: "combat", label: "COMBAT" },
  { key: "territory", label: "TERRITORY" },
  { key: "mission", label: "MISSIONS" },
  { key: "diplomacy", label: "DIPLOMACY" },
  { key: "faction", label: "FACTIONS" },
  { key: "world_event", label: "WORLD" },
  { key: "economy", label: "ECONOMY" },
  { key: "aid", label: "AID" },
  { key: "broadcast", label: "COMMS" },
];

export default function NewsFeedFilters({
  categoryFilter, setCategoryFilter,
  myFactionOnly, setMyFactionOnly,
  userFactionIds,
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(c => (
          <Button
            key={c.key}
            variant={categoryFilter === c.key ? "default" : "outline"}
            size="sm"
            className="h-6 text-[9px] uppercase tracking-wider px-2"
            onClick={() => setCategoryFilter(c.key)}
          >
            {c.label}
          </Button>
        ))}
      </div>
      {userFactionIds.length > 0 && (
        <Button
          variant={myFactionOnly ? "default" : "outline"}
          size="sm"
          className="h-6 text-[9px] uppercase tracking-wider"
          onClick={() => setMyFactionOnly(!myFactionOnly)}
        >
          {myFactionOnly ? "SHOWING: MY FACTION" : "SHOW: MY FACTION ONLY"}
        </Button>
      )}
    </div>
  );
}