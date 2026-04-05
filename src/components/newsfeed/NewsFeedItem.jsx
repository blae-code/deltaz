import { Badge } from "@/components/ui/badge";
import {
  Radio, Crosshair, Shield, MapPin, AlertTriangle, Zap,
  Swords, ArrowLeftRight, HeartPulse, Package, Users,
} from "lucide-react";
import moment from "moment";

const categoryConfig = {
  combat: { icon: Swords, color: "text-status-danger", label: "COMBAT", bg: "bg-status-danger/10 border-status-danger/20" },
  territory: { icon: MapPin, color: "text-accent", label: "TERRITORY", bg: "bg-accent/10 border-accent/20" },
  world_event: { icon: AlertTriangle, color: "text-accent", label: "WORLD EVENT", bg: "bg-accent/10 border-accent/20" },
  mission: { icon: Crosshair, color: "text-primary", label: "MISSION", bg: "bg-primary/10 border-primary/20" },
  diplomacy: { icon: ArrowLeftRight, color: "text-status-info", label: "DIPLOMACY", bg: "bg-status-info/10 border-status-info/20" },
  faction: { icon: Shield, color: "text-primary", label: "FACTION", bg: "bg-primary/10 border-primary/20" },
  economy: { icon: Package, color: "text-accent", label: "ECONOMY", bg: "bg-accent/10 border-accent/20" },
  broadcast: { icon: Radio, color: "text-foreground", label: "BROADCAST", bg: "bg-muted border-border" },
  system: { icon: Zap, color: "text-muted-foreground", label: "SYSTEM", bg: "bg-muted border-border" },
  aid: { icon: HeartPulse, color: "text-status-ok", label: "AID", bg: "bg-status-ok/10 border-status-ok/20" },
  population: { icon: Users, color: "text-primary", label: "POPULATION", bg: "bg-primary/10 border-primary/20" },
};

const severityIndicator = {
  info: "",
  warning: "border-l-2 border-l-accent",
  critical: "border-l-2 border-l-status-danger",
  emergency: "border-l-2 border-l-status-danger bg-status-danger/5",
};

export default function NewsFeedItem({ item, factions }) {
  const config = categoryConfig[item.category] || categoryConfig.broadcast;
  const Icon = config.icon;
  const faction = item.faction_id ? factions?.find(f => f.id === item.faction_id) : null;

  return (
    <div className={`border rounded-sm p-3 transition-all ${config.bg} ${severityIndicator[item.severity] || ""}`}>
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 shrink-0 ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className={`text-[8px] uppercase tracking-wider ${config.color} border-current/20`}>
              {config.label}
            </Badge>
            {item.severity && item.severity !== "info" && (
              <Badge variant="outline" className={`text-[8px] uppercase ${
                item.severity === "critical" || item.severity === "emergency" ? "text-status-danger" : "text-accent"
              }`}>
                {item.severity}
              </Badge>
            )}
            {faction && (
              <span className="flex items-center gap-1 text-[9px]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: faction.color }} />
                <span style={{ color: faction.color }}>{faction.tag}</span>
              </span>
            )}
            {item.territory_name && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" /> {item.territory_name}
              </span>
            )}
          </div>
          <h4 className="text-xs font-semibold text-foreground">{item.title}</h4>
          {item.content && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.content}</p>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground shrink-0 whitespace-nowrap">
          {moment(item.timestamp).fromNow()}
        </span>
      </div>
    </div>
  );
}