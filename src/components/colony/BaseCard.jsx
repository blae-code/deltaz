import { Badge } from "@/components/ui/badge";
import { Home, Users, Shield, MapPin, Package } from "lucide-react";

const statusStyle = {
  active: "text-status-ok bg-status-ok/10 border-status-ok/20",
  abandoned: "text-muted-foreground bg-muted",
  destroyed: "text-status-danger bg-status-danger/10 border-status-danger/20",
  under_siege: "text-status-warn bg-status-warn/10 border-status-warn/20",
};

export default function BaseCard({ base, survivors, territory, selected, onSelect, moduleCount }) {
  const activeSurvivors = survivors.filter((s) => s.status === "active");
  const totalBonus = activeSurvivors.reduce((acc, s) => {
    const key = s.bonus_type || "unknown";
    acc[key] = (acc[key] || 0) + (s.bonus_value || 0);
    return acc;
  }, {});

  return (
    <button
      onClick={() => onSelect(base.id)}
      className={`w-full text-left border rounded-sm overflow-hidden transition-all ${
        selected
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 border-b border-border/50">
        <Home className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold font-display text-foreground truncate">{base.name}</div>
          <div className="text-[9px] text-muted-foreground flex items-center gap-2">
            {base.sector && <span>{base.sector}</span>}
            {territory && <span>· {territory.name}</span>}
          </div>
        </div>
        <Badge variant="outline" className={`text-[8px] uppercase ${statusStyle[base.status] || ""}`}>
          {base.status}
        </Badge>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{activeSurvivors.length}/{base.capacity || 5}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>DEF {base.defense_level || 1}</span>
          </div>
          {moduleCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Package className="h-3 w-3" />
              <span>{moduleCount} modules</span>
            </div>
          )}
        </div>

        {/* Aggregate bonuses */}
        {Object.keys(totalBonus).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(totalBonus).map(([type, val]) => (
              <span key={type} className="text-[8px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
                +{val}% {type.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}