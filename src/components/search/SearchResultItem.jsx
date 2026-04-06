import { Badge } from "@/components/ui/badge";
import { Crosshair, Shield, Map, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig = {
  missions: { icon: Crosshair, color: "text-accent", label: "MISSION" },
  survivors: { icon: Users, color: "text-primary", label: "SURVIVOR" },
  territories: { icon: Map, color: "text-chart-4", label: "TERRITORY" },
  factions: { icon: Shield, color: "text-chart-2", label: "CLAN" },
};

const statusColors = {
  available: "text-status-ok",
  in_progress: "text-accent",
  completed: "text-primary",
  failed: "text-status-danger",
  active: "text-status-ok",
  injured: "text-status-warn",
  missing: "text-muted-foreground",
  dead: "text-status-danger",
  secured: "text-status-ok",
  contested: "text-status-warn",
  hostile: "text-status-danger",
  uncharted: "text-muted-foreground",
};

export default function SearchResultItem({ item, isSelected, onClick, onMouseEnter }) {
  const config = typeConfig[item.type] || typeConfig.missions;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full text-left flex items-center gap-2.5 px-3 py-2 transition-colors border-b border-border/30",
        isSelected ? "bg-primary/10" : "hover:bg-secondary/50"
      )}
    >
      <div className={`h-6 w-6 rounded-sm flex items-center justify-center bg-current/5 border border-current/20 shrink-0 ${config.color}`}>
        <Icon className="h-3 w-3" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-foreground truncate">{item.title}</span>
          {item.status && (
            <span className={`text-[7px] font-mono uppercase tracking-wider ${statusColors[item.status] || "text-muted-foreground"}`}>
              {item.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[7px] py-0 h-3.5">{config.label}</Badge>
          {item.subtitle && (
            <span className="text-[8px] text-muted-foreground truncate">{item.subtitle}</span>
          )}
        </div>
      </div>

      {item.meta && (
        <span className="text-[8px] text-muted-foreground shrink-0">{item.meta}</span>
      )}

      <ArrowRight className={cn("h-3 w-3 shrink-0 transition-opacity", isSelected ? "text-primary opacity-100" : "opacity-0")} />
    </button>
  );
}