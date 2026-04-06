import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search, AlertTriangle } from "lucide-react";
import { useState } from "react";

const threatColors = {
  minimal: "text-status-ok", low: "text-status-ok",
  moderate: "text-status-warn", high: "text-status-danger", critical: "text-status-danger",
};
const statusStyles = {
  secured: "border-status-ok/30 hover:border-status-ok/50",
  uncharted: "border-muted-foreground/20 hover:border-muted-foreground/40",
  contested: "border-status-warn/30 hover:border-status-warn/50",
  hostile: "border-status-danger/30 hover:border-status-danger/50",
};

export default function TerritorySelector({ territories, factions, selectedId, onSelect }) {
  const [search, setSearch] = useState("");

  const filtered = territories.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.sector?.toLowerCase().includes(search.toLowerCase())
  );

  const getFaction = (id) => factions.find(f => f.id === id);

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          Target Territory
        </h3>
      </div>
      <div className="p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search territories..."
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono pl-7"
          />
        </div>
        <div className="space-y-1 max-h-[240px] overflow-y-auto">
          {filtered.map(t => {
            const faction = getFaction(t.controlling_faction_id);
            const isSelected = selectedId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className={`w-full text-left flex items-center justify-between gap-2 rounded-sm px-2.5 py-2 border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : statusStyles[t.status] || "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className={`h-3 w-3 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-[8px] text-muted-foreground">
                      {t.sector} · {t.status}
                      {faction && <> · <span style={{ color: faction.color }}>[{faction.tag}]</span></>}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[7px] shrink-0 ${threatColors[t.threat_level] || ""} border-current/30`}>
                  <AlertTriangle className="h-2 w-2 mr-0.5" />
                  {t.threat_level}
                </Badge>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-3 font-mono">No territories found</p>
          )}
        </div>
      </div>
    </div>
  );
}