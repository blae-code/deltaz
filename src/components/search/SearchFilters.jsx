import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MISSION_TYPES = ["recon", "extraction", "sabotage", "escort", "scavenge", "elimination"];
const MISSION_STATUS = ["available", "in_progress", "pending_verification", "completed", "failed", "expired"];
const MISSION_DIFFICULTY = ["routine", "hazardous", "critical", "suicide"];

const SURVIVOR_SKILLS = ["scavenger", "medic", "mechanic", "farmer", "guard", "trader", "engineer", "cook"];
const SURVIVOR_STATUS = ["active", "injured", "missing", "dead", "departed"];
const SURVIVOR_MORALE = ["desperate", "anxious", "neutral", "content", "thriving"];
const SURVIVOR_HEALTH = ["critical", "injured", "sick", "healthy", "peak"];

const TERRITORY_STATUS = ["secured", "contested", "hostile", "uncharted"];
const TERRITORY_THREAT = ["minimal", "low", "moderate", "high", "critical"];

const FACTION_STATUS = ["active", "disbanded", "hostile", "hidden"];

export default function SearchFilters({ category, filters, onChange }) {
  const [factions, setFactions] = useState([]);

  useEffect(() => {
    base44.entities.Faction.list("-created_date", 50).then(setFactions).catch(() => {});
  }, []);

  const set = (key, val) => {
    const next = { ...filters };
    if (!val || val === "all") { delete next[key]; }
    else { next[key] = val; }
    onChange(next);
  };

  const showMissions = category === "all" || category === "missions";
  const showSurvivors = category === "all" || category === "survivors";
  const showTerritories = category === "all" || category === "territories";
  const showFactions = category === "all" || category === "factions";

  return (
    <div className="border-b border-border/50 px-3 py-2 bg-secondary/20 space-y-2">
      <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Advanced Filters</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {showMissions && (
          <>
            <FilterSelect label="Mission Type" value={filters.mission_type} options={MISSION_TYPES} onChange={(v) => set("mission_type", v)} />
            <FilterSelect label="Mission Status" value={filters.mission_status} options={MISSION_STATUS} onChange={(v) => set("mission_status", v)} />
            <FilterSelect label="Difficulty" value={filters.mission_difficulty} options={MISSION_DIFFICULTY} onChange={(v) => set("mission_difficulty", v)} />
            <FilterSelect label="Mission Faction" value={filters.mission_faction} options={factions.map(f => ({ value: f.id, label: f.name }))} onChange={(v) => set("mission_faction", v)} />
          </>
        )}
        {showSurvivors && (
          <>
            <FilterSelect label="Skill" value={filters.survivor_skill} options={SURVIVOR_SKILLS} onChange={(v) => set("survivor_skill", v)} />
            <FilterSelect label="Survivor Status" value={filters.survivor_status} options={SURVIVOR_STATUS} onChange={(v) => set("survivor_status", v)} />
            <FilterSelect label="Morale" value={filters.survivor_morale} options={SURVIVOR_MORALE} onChange={(v) => set("survivor_morale", v)} />
            <FilterSelect label="Health" value={filters.survivor_health} options={SURVIVOR_HEALTH} onChange={(v) => set("survivor_health", v)} />
          </>
        )}
        {showTerritories && (
          <>
            <FilterSelect label="Territory Status" value={filters.territory_status} options={TERRITORY_STATUS} onChange={(v) => set("territory_status", v)} />
            <FilterSelect label="Threat Level" value={filters.territory_threat} options={TERRITORY_THREAT} onChange={(v) => set("territory_threat", v)} />
          </>
        )}
        {showFactions && (
          <FilterSelect label="Clan Status" value={filters.faction_status} options={FACTION_STATUS} onChange={(v) => set("faction_status", v)} />
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  const isObjectOptions = options.length > 0 && typeof options[0] === "object";
  return (
    <div>
      <Label className="text-[7px] font-mono tracking-widest text-muted-foreground uppercase">{label}</Label>
      <Select value={value || "all"} onValueChange={onChange}>
        <SelectTrigger className="h-7 font-mono text-[10px] bg-muted mt-0.5">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {isObjectOptions
            ? options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)
            : options.map((o) => <SelectItem key={o} value={o}>{o.toUpperCase()}</SelectItem>)
          }
        </SelectContent>
      </Select>
    </div>
  );
}