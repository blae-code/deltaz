import { Badge } from "@/components/ui/badge";
import {
  Crosshair, Skull, Shield, MapPin, Flag, ArrowLeftRight,
  UserPlus, UserMinus, Package, Flame, Truck, Bomb, Zap, FileText
} from "lucide-react";
import moment from "moment";

const TYPE_CONFIG = {
  combat_kill: { icon: Crosshair, color: "text-destructive", label: "KILL" },
  combat_death: { icon: Skull, color: "text-destructive", label: "DEATH" },
  combat_raid: { icon: Flame, color: "text-accent", label: "RAID" },
  base_breach: { icon: Shield, color: "text-destructive", label: "BREACH" },
  territory_capture: { icon: Flag, color: "text-primary", label: "CAPTURE" },
  territory_lost: { icon: Flag, color: "text-destructive", label: "LOST" },
  mission_accepted: { icon: Crosshair, color: "text-primary", label: "ACCEPT" },
  mission_completed: { icon: Crosshair, color: "text-status-ok", label: "COMPLETE" },
  mission_failed: { icon: Crosshair, color: "text-destructive", label: "FAILED" },
  mission_abandoned: { icon: Crosshair, color: "text-accent", label: "ABANDON" },
  trade_completed: { icon: ArrowLeftRight, color: "text-primary", label: "TRADE" },
  diplomacy_change: { icon: FileText, color: "text-accent", label: "DIPLO" },
  player_join: { icon: UserPlus, color: "text-primary", label: "JOIN" },
  player_leave: { icon: UserMinus, color: "text-muted-foreground", label: "LEAVE" },
  airdrop: { icon: Package, color: "text-accent", label: "AIRDROP" },
  explosion: { icon: Bomb, color: "text-destructive", label: "EXPLOSION" },
  vehicle_destroyed: { icon: Truck, color: "text-accent", label: "VEHICLE" },
  custom: { icon: Zap, color: "text-muted-foreground", label: "EVENT" },
};

const SEVERITY_STYLE = {
  routine: "border-border",
  notable: "border-accent/30 bg-accent/5",
  critical: "border-destructive/30 bg-destructive/5",
  emergency: "border-destructive/50 bg-destructive/10",
};

const SEVERITY_BADGE = {
  routine: "",
  notable: "bg-accent/20 text-accent border-accent/30",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  emergency: "bg-destructive/30 text-destructive border-destructive/50 animate-pulse",
};

export default function OpsLogEntry({ log }) {
  const config = TYPE_CONFIG[log.event_type] || TYPE_CONFIG.custom;
  const Icon = config.icon;
  const severity = log.severity || "routine";

  return (
    <div className={`border rounded-sm px-3 py-2.5 bg-card transition-colors ${SEVERITY_STYLE[severity]}`}>
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className={`mt-0.5 shrink-0 ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[8px] uppercase px-1 py-0 ${config.color}`}>
              {config.label}
            </Badge>
            <span className="text-xs font-semibold text-foreground">{log.title}</span>
            {severity !== "routine" && (
              <Badge className={`text-[8px] uppercase px-1 py-0 border ${SEVERITY_BADGE[severity]}`}>
                {severity}
              </Badge>
            )}
          </div>

          {/* Detail */}
          {log.detail && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{log.detail}</p>
          )}

          {/* Meta tags */}
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
            <span className="text-muted-foreground/60">
              {moment(log.created_date).format("MMM D HH:mm:ss")}
            </span>

            {log.player_callsign && (
              <span className="text-primary font-semibold">{log.player_callsign}</span>
            )}

            {log.target_callsign && (
              <span>
                → <span className="text-accent font-semibold">{log.target_callsign}</span>
              </span>
            )}

            {log.faction_name && (
              <span className="flex items-center gap-0.5">
                <Shield className="h-3 w-3" /> {log.faction_name}
              </span>
            )}

            {log.sector && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> {log.sector}
              </span>
            )}

            {log.mission_title && (
              <span className="flex items-center gap-0.5 text-primary/70">
                <Crosshair className="h-3 w-3" /> {log.mission_title}
              </span>
            )}

            {log.weapon && (
              <span className="italic">{log.weapon}</span>
            )}

            {log.distance > 0 && (
              <span>{log.distance}m</span>
            )}

            {log.source && log.source !== "system" && (
              <Badge variant="outline" className="text-[8px] uppercase px-1 py-0">
                {log.source}
              </Badge>
            )}
          </div>
        </div>

        {/* Timestamp (right) */}
        <span className="text-[9px] text-muted-foreground/50 font-mono shrink-0 hidden sm:block">
          {moment(log.created_date).fromNow()}
        </span>
      </div>
    </div>
  );
}