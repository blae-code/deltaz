import { MapPin, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const threatColors = {
  minimal: "text-primary",
  low: "text-chart-4",
  moderate: "text-accent",
  high: "text-destructive",
  critical: "text-destructive",
};

const statusColors = {
  secured: "text-primary",
  contested: "text-accent",
  hostile: "text-destructive",
  uncharted: "text-muted-foreground",
};

export default function TerritoryCard({ territory, currentFaction }) {
  return (
    <div className="border border-border rounded-sm p-3 bg-secondary/20 space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">{territory.name}</span>
        <Badge variant="outline" className="text-[9px]">{territory.sector}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="border border-border rounded-sm p-1.5">
          <div className="text-[9px] text-muted-foreground tracking-wider">CONTROL</div>
          <div className="text-[10px] font-semibold truncate" style={{ color: currentFaction?.color }}>
            {currentFaction?.name || "NONE"}
          </div>
        </div>
        <div className="border border-border rounded-sm p-1.5">
          <div className="text-[9px] text-muted-foreground tracking-wider">THREAT</div>
          <div className={`text-[10px] font-semibold uppercase ${threatColors[territory.threat_level] || "text-muted-foreground"}`}>
            {territory.threat_level}
          </div>
        </div>
        <div className="border border-border rounded-sm p-1.5">
          <div className="text-[9px] text-muted-foreground tracking-wider">STATUS</div>
          <div className={`text-[10px] font-semibold uppercase ${statusColors[territory.status] || "text-muted-foreground"}`}>
            {territory.status}
          </div>
        </div>
      </div>

      {territory.resources?.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] text-muted-foreground tracking-wider">RESOURCES:</span>
          {territory.resources.map((r) => (
            <Badge key={r} variant="secondary" className="text-[9px]">{r}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}