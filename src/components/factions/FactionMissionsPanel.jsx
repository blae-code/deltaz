import { Badge } from "@/components/ui/badge";
import { Crosshair } from "lucide-react";

const diffColor = {
  routine: "text-primary",
  hazardous: "text-accent",
  critical: "text-status-warn",
  suicide: "text-status-danger",
};

const statusBadge = {
  available: "bg-status-ok/10 text-status-ok border-status-ok/20",
  in_progress: "bg-accent/10 text-accent border-accent/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  failed: "bg-status-danger/10 text-status-danger border-status-danger/20",
};

export default function FactionMissionsPanel({ jobs, territories }) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-4">
        <Crosshair className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
        <p className="text-[10px] text-muted-foreground">No missions issued by this faction.</p>
      </div>
    );
  }

  const getTerritoryName = (id) => territories.find(t => t.id === id)?.name || "Unknown";

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {jobs.map(j => (
        <div key={j.id} className="flex items-center justify-between bg-secondary/30 rounded-sm px-2.5 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono text-foreground truncate">{j.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[8px] font-mono uppercase ${diffColor[j.difficulty] || ""}`}>
                {j.difficulty}
              </span>
              <span className="text-[8px] text-muted-foreground uppercase">{j.type}</span>
              <span className="text-[8px] text-muted-foreground">{getTerritoryName(j.territory_id)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] text-primary font-mono">+{j.reward_reputation || 0}</span>
            <Badge variant="outline" className={`text-[8px] ${statusBadge[j.status] || ""}`}>
              {j.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}