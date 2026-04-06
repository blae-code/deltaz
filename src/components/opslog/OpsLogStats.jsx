import { Crosshair, Skull, Flag, Shield, Flame } from "lucide-react";

const STAT_DEFS = [
  { key: "combat", label: "COMBAT", icon: Crosshair, types: ["combat_kill", "combat_death", "combat_raid"], color: "text-destructive" },
  { key: "territory", label: "TERRITORY", icon: Flag, types: ["territory_capture", "territory_lost", "base_breach"], color: "text-accent" },
  { key: "missions", label: "MISSIONS", icon: Crosshair, types: ["mission_accepted", "mission_completed", "mission_failed", "mission_abandoned"], color: "text-primary" },
  { key: "other", label: "OTHER", icon: Flame, types: ["trade_completed", "diplomacy_change", "airdrop", "explosion", "vehicle_destroyed", "custom"], color: "text-muted-foreground" },
];

export default function OpsLogStats({ logs }) {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
      {STAT_DEFS.map((s) => {
        const count = logs.filter((l) => s.types.includes(l.event_type)).length;
        const Icon = s.icon;
        return (
          <div key={s.key} className="border border-border rounded-sm px-3 py-2 bg-card">
            <div className="flex items-center gap-1.5">
              <Icon className={`h-3 w-3 ${s.color}`} />
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">{s.label}</span>
            </div>
            <span className={`text-lg font-bold font-display ${s.color}`}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}