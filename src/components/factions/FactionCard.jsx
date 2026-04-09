import { Badge } from "@/components/ui/badge";
import StatusIndicator from "../terminal/StatusIndicator";
import { Shield, Users } from "lucide-react";

const statusMap = {
  active: "online",
  disbanded: "offline",
  hostile: "critical",
  allied: "online",
};

export default function FactionCard({ faction, members = [], selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(faction.id)}
      className={`w-full text-left panel-frame overflow-hidden transition-all ${
        selected
          ? "shadow-[inset_2px_0_0_0_hsl(var(--primary))] bg-primary/5"
          : "hover:border-primary/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3 bg-secondary/30">
        <div
          className="h-9 w-9 border flex items-center justify-center shrink-0"
          style={{
            borderColor: faction.color || "hsl(var(--border))",
            backgroundColor: (faction.color || "transparent") + "20",
          }}
        >
          <Shield className="h-4 w-4" style={{ color: faction.color || "hsl(var(--primary))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-display text-foreground truncate">{faction.name}</h3>
            {faction.tag && <Badge variant="outline" className="text-[10px] shrink-0">{faction.tag}</Badge>}
          </div>
          <StatusIndicator status={statusMap[faction.status] || "offline"} label={faction.status} className="mt-0.5" />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {faction.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">{faction.description}</p>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{members.length} MEMBER{members.length !== 1 ? "S" : ""}</span>
        </div>
      </div>
    </button>
  );
}
