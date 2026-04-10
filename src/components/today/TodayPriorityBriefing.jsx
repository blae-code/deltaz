import { Link } from "react-router-dom";
import { AlertTriangle, Crosshair, Hammer, Wrench, Package, ArrowLeftRight } from "lucide-react";

/**
 * TodayPriorityBriefing — the "what matters right now" block.
 * Surfaces actionable items the player should attend to, ordered by urgency.
 * No speculative backend calls — works purely from data already fetched by Today.
 */
export default function TodayPriorityBriefing({ jobs, userEmail, inventory, craftingProjects, colony }) {
  const items = [];

  // 1. Colony emergencies (critical or high threat)
  if (colony && (colony.threat_level === "critical" || colony.threat_level === "high")) {
    items.push({
      icon: AlertTriangle,
      label: `Colony threat: ${colony.threat_level}`,
      to: "/colony",
      urgency: "critical",
    });
  }

  // 2. Colony resource critically low
  if (colony) {
    const lowMetrics = [];
    if ((colony.food_reserves ?? 100) < 25) lowMetrics.push("food");
    if ((colony.water_supply ?? 100) < 25) lowMetrics.push("water");
    if ((colony.medical_supplies ?? 100) < 25) lowMetrics.push("medical");
    if ((colony.defense_integrity ?? 100) < 25) lowMetrics.push("defense");
    if (lowMetrics.length > 0) {
      items.push({
        icon: AlertTriangle,
        label: `Colony ${lowMetrics.join(", ")} critically low`,
        to: "/colony",
        urgency: "warning",
      });
    }
  }

  // 3. Active missions — remind the player they have ops to complete
  const myActive = (jobs || []).filter(j => j.assigned_to === userEmail && j.status === "in_progress");
  if (myActive.length > 0) {
    items.push({
      icon: Crosshair,
      label: `${myActive.length} active mission${myActive.length > 1 ? "s" : ""} in progress`,
      to: "/jobs",
      urgency: "action",
    });
  }

  // 4. Crafting projects ready to build
  const readyProjects = (craftingProjects || []).filter(p => p.status === "ready");
  if (readyProjects.length > 0) {
    items.push({
      icon: Hammer,
      label: `${readyProjects.length} craft${readyProjects.length > 1 ? "s" : ""} ready to build`,
      to: "/workbench",
      urgency: "action",
    });
  }

  // 5. Degraded gear
  const degraded = (inventory || []).filter(i => (i.condition ?? 100) < 30);
  if (degraded.length > 0) {
    items.push({
      icon: Wrench,
      label: `${degraded.length} item${degraded.length > 1 ? "s" : ""} degraded — needs repair or replacement`,
      to: "/inventory",
      urgency: "warning",
    });
  }

  // 6. No active mission — suggest picking one up
  if (myActive.length === 0 && (jobs || []).filter(j => j.status === "available").length > 0) {
    items.push({
      icon: Crosshair,
      label: "No active mission — contracts available on the board",
      to: "/jobs",
      urgency: "suggestion",
    });
  }

  // 7. Empty inventory nudge
  if ((inventory || []).length === 0) {
    items.push({
      icon: Package,
      label: "Gear locker empty — log your loadout to track condition & trades",
      to: "/inventory",
      urgency: "suggestion",
    });
  }

  if (items.length === 0) return null;

  const urgencyStyles = {
    critical: "border-destructive/40 bg-destructive/5 text-destructive",
    warning: "border-accent/30 bg-accent/5 text-accent",
    action: "border-primary/30 bg-primary/5 text-primary",
    suggestion: "border-border bg-secondary/30 text-muted-foreground",
  };

  const urgencyDot = {
    critical: "bg-destructive",
    warning: "bg-accent",
    action: "bg-primary",
    suggestion: "bg-muted-foreground",
  };

  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] text-primary/70 tracking-widest uppercase font-mono font-semibold mb-2">
        PRIORITY BRIEFING
      </h3>
      {items.slice(0, 5).map((item, idx) => {
        const Icon = item.icon;
        return (
          <Link
            key={idx}
            to={item.to}
            className={`flex items-center gap-2.5 px-3 py-2.5 border transition-all hover:opacity-90 ${urgencyStyles[item.urgency]} ${
            item.urgency === "critical" ? "shadow-[inset_2px_0_0_0_hsl(var(--destructive))]" :
            item.urgency === "warning"  ? "shadow-[inset_2px_0_0_0_hsl(var(--accent))]" :
            item.urgency === "action"   ? "shadow-[inset_2px_0_0_0_hsl(var(--primary))]" :
            ""
          }`}
          >
            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${urgencyDot[item.urgency]}`} />
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono flex-1 leading-snug">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}