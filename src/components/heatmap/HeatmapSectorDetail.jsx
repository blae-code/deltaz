import { Shield, Crosshair, AlertTriangle, MapPin } from "lucide-react";
import moment from "moment";

const statusConfig = {
  secured: { color: "text-status-ok", icon: Shield, label: "SECURED" },
  contested: { color: "text-status-warn", icon: Crosshair, label: "CONTESTED" },
  hostile: { color: "text-status-danger", icon: AlertTriangle, label: "HOSTILE" },
  uncharted: { color: "text-muted-foreground", icon: MapPin, label: "UNCHARTED" },
};

const threatLabels = {
  minimal: { color: "text-status-ok", label: "MINIMAL" },
  low: { color: "text-status-ok", label: "LOW" },
  moderate: { color: "text-status-warn", label: "MODERATE" },
  high: { color: "text-status-danger", label: "HIGH" },
  critical: { color: "text-status-danger", label: "CRITICAL" },
};

export default function HeatmapSectorDetail({ sector, territory, faction, diplomacy, factionMap }) {
  if (!sector) {
    return (
      <div className="border border-border rounded-sm p-3 bg-card">
        <p className="text-[9px] font-mono text-muted-foreground tracking-widest text-center py-4">
          HOVER OR CLICK A SECTOR FOR DETAILS
        </p>
      </div>
    );
  }

  const cfg = statusConfig[territory?.status] || statusConfig.uncharted;
  const Icon = cfg.icon;
  const threat = threatLabels[territory?.threat_level] || threatLabels.minimal;

  // Find wars involving this territory's faction
  const factionWars = territory?.controlling_faction_id
    ? (diplomacy || []).filter(
        (d) =>
          d.status === "war" &&
          (d.faction_a_id === territory.controlling_faction_id || d.faction_b_id === territory.controlling_faction_id)
      )
    : [];

  return (
    <div className="border border-border rounded-sm p-3 bg-card space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-primary tracking-widest font-bold">
          SECTOR {sector}
        </span>
        <span className={`text-[9px] font-mono font-semibold ${cfg.color}`}>
          <Icon className="h-3 w-3 inline mr-1" />
          {cfg.label}
        </span>
      </div>

      {territory ? (
        <div className="space-y-1.5">
          <p className="text-xs text-foreground font-semibold">{territory.name}</p>

          {/* Threat level */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">Threat Level</span>
            <span className={`text-[9px] font-mono font-semibold ${threat.color}`}>
              {threat.label}
            </span>
          </div>

          {/* Controlling faction */}
          {faction && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Control</span>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: faction.color || "#888" }} />
                <span className="text-[9px] font-mono text-foreground">{faction.name}</span>
              </div>
            </div>
          )}

          {/* Resources */}
          {territory.resources?.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Resources</span>
              <span className="text-[9px] font-mono text-primary">
                {territory.resources.join(", ")}
              </span>
            </div>
          )}

          {/* Active wars for controlling faction */}
          {factionWars.length > 0 && (
            <div className="border-t border-border/50 pt-1.5 mt-1.5">
              <p className="text-[8px] text-status-danger font-mono tracking-wider mb-1">⚔ ACTIVE CONFLICTS</p>
              {factionWars.map((w) => {
                const enemyId = w.faction_a_id === territory.controlling_faction_id ? w.faction_b_id : w.faction_a_id;
                const enemy = factionMap?.[enemyId];
                return (
                  <p key={w.id} className="text-[8px] text-muted-foreground">
                    vs {enemy?.name || "Unknown"} — {w.war_reason || "No stated reason"}
                  </p>
                );
              })}
            </div>
          )}

          {/* Last updated */}
          <p className="text-[8px] text-muted-foreground/60 mt-1">
            Updated {moment(territory.updated_date).fromNow()}
          </p>
        </div>
      ) : (
        <p className="text-[9px] text-muted-foreground">No territory data mapped to this sector.</p>
      )}
    </div>
  );
}