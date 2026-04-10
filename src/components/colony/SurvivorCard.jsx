import { Badge } from "@/components/ui/badge";
import { User, Heart, Smile, Wrench, Shield, Wheat, Search, ShoppingBag, Cpu, ChefHat, Swords, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import SurvivorSkillsPanel from "./SurvivorSkillsPanel";

const skillIcons = {
  scavenger: Search,
  medic: Heart,
  mechanic: Wrench,
  farmer: Wheat,
  guard: Shield,
  trader: ShoppingBag,
  engineer: Cpu,
  cook: ChefHat,
};

const moraleStyle = {
  desperate: "text-status-danger bg-status-danger/10",
  anxious: "text-status-warn bg-status-warn/10",
  neutral: "text-muted-foreground bg-secondary",
  content: "text-primary bg-primary/10",
  thriving: "text-status-ok bg-status-ok/10",
};

const healthStyle = {
  critical: "text-status-danger",
  injured: "text-status-warn",
  sick: "text-status-warn",
  healthy: "text-status-ok",
  peak: "text-primary",
};

const originStyle = {
  wanderer: "bg-muted text-muted-foreground",
  refugee: "bg-status-warn/10 text-status-warn border-status-warn/20",
  recruited: "bg-primary/10 text-primary border-primary/20",
  rescued: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  trader: "bg-accent/10 text-accent border-accent/20",
  assigned: "bg-primary/10 text-primary border-primary/20",
};

export default function SurvivorCard({ survivor, compact }) {
  const SkillIcon = skillIcons[survivor.skill] || User;
  const skillDots = Array.from({ length: 5 }, (_, i) => i < (survivor.skill_level || 1));
  const [showSkills, setShowSkills] = useState(false);

  if (compact) {
    return (
      <div className="panel-frame flex items-center gap-2 px-3 py-2 bg-secondary/20 hover:bg-secondary/30 hover:shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.3)] transition-all">
        <SkillIcon className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-foreground truncate block">{survivor.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground">{survivor.skill} · {survivor.nickname}</span>
            <SurvivorSkillsPanel survivor={survivor} compact />
          </div>
        </div>
        <Badge variant="outline" className={`text-[8px] ${moraleStyle[survivor.morale] || ""}`}>
          {survivor.morale}
        </Badge>
      </div>
    );
  }

  return (
    <div className="panel-frame overflow-hidden hover:shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.25)] transition-all">
      <div className="px-3 py-2 bg-secondary/30 border-b border-border/50 flex items-center gap-2">
        <SkillIcon className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">{survivor.name}</div>
          {survivor.nickname && (
            <div className="text-[9px] text-accent italic">"{survivor.nickname}"</div>
          )}
        </div>
        <Badge variant="outline" className={`text-[8px] ${originStyle[survivor.origin] || ""}`}>
          {survivor.origin}
        </Badge>
      </div>

      <div className="p-3 space-y-2">
        {/* Skill + Level */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{survivor.skill}</span>
          <div className="flex gap-0.5">
            {skillDots.map((filled, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${filled ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
        </div>

        {/* Health + Morale */}
        <div className="flex gap-2">
          <Badge variant="outline" className={`text-[8px] ${healthStyle[survivor.health] || ""}`}>
            ♥ {survivor.health}
          </Badge>
          <Badge variant="outline" className={`text-[8px] ${moraleStyle[survivor.morale] || ""}`}>
            ☺ {survivor.morale}
          </Badge>
        </div>

        {/* Current Task */}
        {survivor.current_task && survivor.current_task !== "idle" && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono">
            <Clock className="h-3 w-3 text-accent" />
            <span className="text-accent uppercase">{survivor.current_task}</span>
          </div>
        )}

        {/* Combat + Tasks Stats */}
        <div className="flex items-center gap-2">
          {survivor.bonus_type && (
            <span className="text-[9px] text-primary font-mono bg-primary/10 px-1.5 py-0.5">
              +{survivor.bonus_value}% {survivor.bonus_type.replace(/_/g, " ")}
            </span>
          )}
          {(survivor.defense_kills || 0) > 0 && (
            <span className="text-[8px] text-status-danger font-mono flex items-center gap-0.5">
              <Swords className="h-2.5 w-2.5" /> {survivor.defense_kills} kills
            </span>
          )}
          {(survivor.tasks_completed || 0) > 0 && (
            <span className="text-[8px] text-muted-foreground font-mono">
              {survivor.tasks_completed} tasks
            </span>
          )}
        </div>

        {/* Backstory */}
        {survivor.backstory && (
          <p className="text-[9px] text-muted-foreground italic line-clamp-2">{survivor.backstory}</p>
        )}

        {/* Personality */}
        {survivor.personality && (
          <div className="text-[9px] text-muted-foreground">
            <span className="text-foreground/80">Trait:</span> {survivor.personality}
          </div>
        )}

        {/* Skills toggle */}
        <button
          onClick={() => setShowSkills(!showSkills)}
          className="flex items-center gap-1 text-[9px] text-primary hover:text-foreground transition-colors w-full"
        >
          {showSkills ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          <span className="uppercase tracking-wider">{showSkills ? 'Hide Skills' : 'View Skills'}</span>
          <SurvivorSkillsPanel survivor={survivor} compact />
        </button>

        {showSkills && (
          <div className="border-t border-border/50 pt-2">
            <SurvivorSkillsPanel survivor={survivor} />
          </div>
        )}
      </div>
    </div>
  );
}
