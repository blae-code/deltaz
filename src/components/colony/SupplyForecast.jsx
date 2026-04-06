import { Wheat, Droplets, Zap, Users } from "lucide-react";

/**
 * SupplyForecast — Shows current resource levels alongside
 * how many survivors are assigned to production tasks that
 * *could* help each resource. No fake math or projections —
 * resource levels are GM-controlled, so we just surface
 * the real data and highlight where staffing gaps exist.
 */

const RESOURCES = [
  { key: "food",  field: "food_reserves", icon: Wheat,    label: "Food",  relatedTasks: ["farm", "cook"] },
  { key: "water", field: "water_supply",  icon: Droplets, label: "Water", relatedTasks: ["scavenge"] },
  { key: "power", field: "power_level",   icon: Zap,      label: "Power", relatedTasks: ["repair"] },
];

function getLevelColor(val) {
  if (val >= 60) return "text-status-ok";
  if (val >= 30) return "text-status-warn";
  return "text-status-danger";
}

function getBarColor(val) {
  if (val >= 60) return "bg-status-ok";
  if (val >= 30) return "bg-status-warn";
  return "bg-status-danger";
}

export default function SupplyForecast({ colony, survivors, compact }) {
  if (!colony) return null;

  const activeSurvivors = (survivors || []).filter(s => s.status === "active");

  // Count survivors on each relevant task
  const taskCounts = {};
  activeSurvivors.forEach(s => {
    if (s.current_task && s.current_task !== "idle") {
      taskCounts[s.current_task] = (taskCounts[s.current_task] || 0) + 1;
    }
  });

  const resourceData = RESOURCES.map(r => {
    const level = colony[r.field] ?? 100;
    const assigned = r.relatedTasks.reduce((sum, t) => sum + (taskCounts[t] || 0), 0);
    return { ...r, level, assigned };
  });

  if (compact) {
    return (
      <div className="border border-border rounded-sm px-3 py-2 bg-secondary/20">
        <div className="text-[9px] text-muted-foreground font-mono tracking-widest uppercase mb-1.5">
          RESOURCE STATUS
        </div>
        <div className="flex gap-3 flex-wrap">
          {resourceData.map(r => {
            const Icon = r.icon;
            return (
              <div key={r.key} className="flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${getLevelColor(r.level)}`} />
                <span className={`text-[10px] font-mono font-semibold ${getLevelColor(r.level)}`}>
                  {r.level}%
                </span>
                {r.assigned > 0 && (
                  <span className="text-[8px] text-muted-foreground font-mono">
                    ({r.assigned} assigned)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {resourceData.map(r => {
          const Icon = r.icon;
          const lowAndUnstaffed = r.level < 40 && r.assigned === 0;
          return (
            <div
              key={r.key}
              className={`border rounded-sm p-3 ${
                lowAndUnstaffed
                  ? "border-status-danger/30 bg-status-danger/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${getLevelColor(r.level)}`} />
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono">
                    {r.label}
                  </span>
                </div>
                <span className={`text-sm font-bold font-mono ${getLevelColor(r.level)}`}>
                  {r.level}%
                </span>
              </div>

              {/* Level bar */}
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(r.level)} ${r.level < 20 ? "animate-pulse" : ""}`}
                  style={{ width: `${Math.max(2, r.level)}%` }}
                />
              </div>

              {/* Assigned workers */}
              <div className="mt-2 flex items-center justify-between text-[8px] font-mono">
                <span className="text-muted-foreground uppercase tracking-wider">
                  Assigned ({r.relatedTasks.join(", ")})
                </span>
                <span className={r.assigned > 0 ? "text-status-ok" : "text-muted-foreground"}>
                  <Users className="h-2.5 w-2.5 inline mr-0.5" />
                  {r.assigned}
                </span>
              </div>

              {lowAndUnstaffed && (
                <div className="text-[8px] text-status-danger font-mono mt-1.5 animate-pulse">
                  LOW — NO SURVIVORS ASSIGNED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}