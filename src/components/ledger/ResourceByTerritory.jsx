import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

const statusBadge = {
  secured: "bg-status-ok/15 text-status-ok border-status-ok/30",
  contested: "bg-status-warn/15 text-status-warn border-status-warn/30",
  hostile: "bg-status-danger/15 text-status-danger border-status-danger/30",
  uncharted: "bg-muted/15 text-muted-foreground border-border",
};

export default function ResourceByTerritory({ territories, factionMap }) {
  // Only show territories that have resources
  const resourceTerritories = territories
    .filter((t) => t.resources?.length > 0)
    .sort((a, b) => (b.resources?.length || 0) - (a.resources?.length || 0));

  if (resourceTerritories.length === 0) {
    return (
      <DataCard title="Territory Resource Map">
        <p className="text-xs text-muted-foreground text-center py-6">No resource-bearing territories mapped.</p>
      </DataCard>
    );
  }

  return (
    <DataCard title="Territory Resource Map">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-1.5 border-b border-border text-[8px] text-muted-foreground tracking-widest font-mono">
        <div className="col-span-2">SECTOR</div>
        <div className="col-span-3">TERRITORY</div>
        <div className="col-span-2">STATUS</div>
        <div className="col-span-2">CONTROL</div>
        <div className="col-span-3">RESOURCES</div>
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-border/30">
        {resourceTerritories.map((t) => {
          const faction = t.controlling_faction_id ? factionMap[t.controlling_faction_id] : null;
          const isContested = t.status === "contested" || t.status === "hostile";

          return (
            <div
              key={t.id}
              className={`grid grid-cols-12 gap-2 px-3 py-2 items-center text-[10px] font-mono transition-colors hover:bg-secondary/30 ${
                isContested ? "bg-status-danger/3" : ""
              }`}
            >
              <div className="col-span-2 text-primary font-bold">{t.sector}</div>
              <div className="col-span-3 text-foreground truncate">{t.name}</div>
              <div className="col-span-2">
                <Badge variant="outline" className={`text-[7px] h-4 ${statusBadge[t.status] || statusBadge.uncharted}`}>
                  {(t.status || "unknown").toUpperCase()}
                </Badge>
              </div>
              <div className="col-span-2">
                {faction ? (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: faction.color || "#888" }} />
                    <span className="text-[9px] text-foreground/70 truncate">{faction.tag || faction.name}</span>
                  </div>
                ) : (
                  <span className="text-[9px] text-muted-foreground">—</span>
                )}
              </div>
              <div className="col-span-3 flex gap-1 flex-wrap">
                {(t.resources || []).map((r) => (
                  <Badge key={r} className="text-[7px] h-4 bg-primary/10 text-primary border-primary/25">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DataCard>
  );
}