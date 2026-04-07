import { Swords, Hammer, Heart, Crown, Mountain, Users } from "lucide-react";

const SKILL_META = {
  combat:     { label: "Combat",     icon: Swords,   color: "text-destructive", bar: "bg-destructive" },
  crafting:   { label: "Crafting",   icon: Hammer,   color: "text-accent",      bar: "bg-accent" },
  medical:    { label: "Medical",    icon: Heart,    color: "text-status-ok",   bar: "bg-status-ok" },
  leadership: { label: "Leadership", icon: Crown,    color: "text-chart-4",     bar: "bg-chart-4" },
  survival:   { label: "Survival",   icon: Mountain, color: "text-primary",     bar: "bg-primary" },
  social:     { label: "Social",     icon: Users,    color: "text-chart-5",     bar: "bg-chart-5" },
};

const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200];

function getSkillLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getProgress(xp) {
  const level = getSkillLevel(xp);
  const curr = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level] || curr + 500;
  const pct = Math.min(100, Math.round(((xp - curr) / (next - curr)) * 100));
  return { level, xp, pct, next };
}

export default function SurvivorSkillsPanel({ survivor, compact }) {
  const skills = survivor.skills || {};
  const skillEntries = Object.keys(SKILL_META).map(key => ({
    key,
    ...SKILL_META[key],
    ...getProgress(skills[key] || 0),
  }));

  // Sort by XP descending
  const sorted = [...skillEntries].sort((a, b) => b.xp - a.xp);
  const totalXp = sorted.reduce((s, e) => s + e.xp, 0);

  if (compact) {
    // Show top 3 skills as small badges
    const top = sorted.filter(s => s.xp > 0).slice(0, 3);
    if (top.length === 0) return null;
    return (
      <div className="flex items-center gap-1">
        {top.map(s => {
          const Icon = s.icon;
          return (
            <span key={s.key} className={`flex items-center gap-0.5 text-[8px] font-mono ${s.color}`}>
              <Icon className="h-2.5 w-2.5" />
              {s.level}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground tracking-widest uppercase">Skills</span>
        <span className="text-[8px] text-muted-foreground font-mono">{totalXp} total XP</span>
      </div>
      <div className="space-y-1.5">
        {sorted.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <Icon className={`h-3 w-3 shrink-0 ${s.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-mono text-foreground">{s.label}</span>
                  <span className="text-[8px] text-muted-foreground font-mono">Lv{s.level} · {s.xp}xp</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${s.bar}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent skill log */}
      {(survivor.skill_log || []).length > 0 && (
        <div className="pt-1.5 border-t border-border/50">
          <span className="text-[8px] text-muted-foreground tracking-widest uppercase block mb-1">Recent XP</span>
          <div className="space-y-0.5">
            {(survivor.skill_log || []).slice(0, 5).map((entry, i) => {
              const meta = SKILL_META[entry.skill];
              return (
                <div key={i} className="flex items-center gap-1.5 text-[8px]">
                  <span className={`font-mono font-semibold ${meta?.color || 'text-foreground'}`}>+{entry.xp}</span>
                  <span className="text-muted-foreground truncate">{entry.reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}