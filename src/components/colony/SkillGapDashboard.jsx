import {
  Pickaxe, Heart, Wrench, Wheat, Shield, ShoppingCart, Cpu, CookingPot,
  AlertTriangle, Users, TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SKILL_META = {
  scavenger: { icon: Pickaxe, label: "Scavenger", desc: "Finds materials & resources" },
  medic:     { icon: Heart, label: "Medic", desc: "Heals injured survivors" },
  mechanic:  { icon: Wrench, label: "Mechanic", desc: "Repairs structures & vehicles" },
  farmer:    { icon: Wheat, label: "Farmer", desc: "Grows food & manages crops" },
  guard:     { icon: Shield, label: "Guard", desc: "Defends base perimeter" },
  trader:    { icon: ShoppingCart, label: "Trader", desc: "Negotiates deals & barters" },
  engineer:  { icon: Cpu, label: "Engineer", desc: "Builds & upgrades structures" },
  cook:      { icon: CookingPot, label: "Cook", desc: "Prepares food & boosts morale" },
};

const ALL_SKILLS = Object.keys(SKILL_META);

export default function SkillGapDashboard({ survivors = [] }) {
  const active = survivors.filter(s => s.status === "active");

  // Count per skill
  const skillCounts = {};
  ALL_SKILLS.forEach(s => { skillCounts[s] = 0; });
  active.forEach(s => {
    if (s.skill && skillCounts[s.skill] !== undefined) {
      skillCounts[s.skill]++;
    }
  });

  // Average skill level per skill
  const skillLevels = {};
  ALL_SKILLS.forEach(sk => {
    const matched = active.filter(s => s.skill === sk);
    skillLevels[sk] = matched.length > 0
      ? Math.round((matched.reduce((sum, s) => sum + (s.skill_level || 1), 0) / matched.length) * 10) / 10
      : 0;
  });

  const maxCount = Math.max(...Object.values(skillCounts), 1);
  const gaps = ALL_SKILLS.filter(s => skillCounts[s] === 0);
  const weak = ALL_SKILLS.filter(s => skillCounts[s] === 1);

  // Sort: gaps first, then weak, then by count ascending
  const sorted = [...ALL_SKILLS].sort((a, b) => {
    if (skillCounts[a] === 0 && skillCounts[b] !== 0) return -1;
    if (skillCounts[b] === 0 && skillCounts[a] !== 0) return 1;
    return skillCounts[a] - skillCounts[b];
  });

  if (active.length === 0) {
    return (
      <div className="text-center py-6">
        <Users className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-[10px] text-muted-foreground/60 italic">
          No active survivors to analyze. Recruit survivors to see skill coverage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryStat label="Active" value={active.length} icon={Users} color="text-primary" />
        <SummaryStat label="Skill Gaps" value={gaps.length} icon={AlertTriangle} color={gaps.length > 0 ? "text-destructive" : "text-status-ok"} />
        <SummaryStat label="At Risk" value={weak.length} icon={TrendingUp} color={weak.length > 0 ? "text-accent" : "text-status-ok"} />
      </div>

      {/* Gap alert */}
      {gaps.length > 0 && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-sm px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="text-[9px] text-destructive font-mono tracking-wider uppercase">MISSING SKILLS</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              No survivors with: {gaps.map(g => SKILL_META[g].label).join(", ")}. Prioritize recruiting these roles.
            </p>
          </div>
        </div>
      )}

      {/* Skill bars */}
      <div className="space-y-1.5">
        {sorted.map(skill => {
          const meta = SKILL_META[skill];
          const Icon = meta.icon;
          const count = skillCounts[skill];
          const avgLevel = skillLevels[skill];
          const isGap = count === 0;
          const isWeak = count === 1;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div
              key={skill}
              className={`flex items-center gap-2.5 border rounded-sm px-3 py-2 transition-colors ${
                isGap ? "border-destructive/30 bg-destructive/5" :
                isWeak ? "border-accent/20 bg-accent/5" :
                "border-border/50 bg-card hover:bg-secondary/20"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isGap ? "text-destructive/50" : isWeak ? "text-accent" : "text-primary"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-foreground">{meta.label}</span>
                    {isGap && <Badge variant="destructive" className="text-[7px] px-1 py-0 h-3.5">GAP</Badge>}
                    {isWeak && <Badge className="text-[7px] px-1 py-0 h-3.5 bg-accent/20 text-accent border-accent/30">THIN</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-mono">
                    {count > 0 && <span>Avg Lv {avgLevel}</span>}
                    <span className="font-bold text-foreground">{count}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isGap ? "bg-destructive/30" :
                      isWeak ? "bg-accent" :
                      "bg-primary"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <p className="text-[8px] text-muted-foreground/60 mt-0.5">{meta.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryStat({ label, value, icon: Icon, color }) {
  return (
    <div className="border border-border bg-card rounded-sm p-2.5 text-center">
      <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${color}`} />
      <div className="text-[8px] text-muted-foreground tracking-widest uppercase">{label}</div>
      <div className={`text-base font-bold font-display ${color}`}>{value}</div>
    </div>
  );
}