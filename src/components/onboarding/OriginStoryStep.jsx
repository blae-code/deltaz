import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, Crosshair, Heart, Search, Wrench, ShoppingBag, Cpu, ChefHat } from "lucide-react";

const skillIcons = {
  guard: Shield, scavenger: Search, medic: Heart, mechanic: Wrench,
  trader: ShoppingBag, engineer: Cpu, cook: ChefHat, farmer: Crosshair,
};

export default function OriginStoryStep({ step, onChoice, chosenId }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="space-y-5">
      {/* Title + Narrative */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold font-display tracking-widest text-primary uppercase">
          {step.title}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          {step.narrative}
        </p>
        <p className="text-xs text-foreground font-semibold">
          {step.question}
        </p>
      </div>

      {/* Choices */}
      <div className="space-y-2">
        {step.choices.map((choice) => {
          const isChosen = chosenId === choice.id;
          const isHovered = hoveredId === choice.id;
          const fx = choice.effects;
          const SkillIcon = fx.skill_affinity ? skillIcons[fx.skill_affinity] : null;

          return (
            <button
              key={choice.id}
              onClick={() => onChoice(choice)}
              onMouseEnter={() => setHoveredId(choice.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`w-full text-left border rounded-sm p-3.5 transition-all ${
                isChosen
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-6 w-6 rounded-sm flex items-center justify-center shrink-0 mt-0.5 ${
                  isChosen ? "bg-primary/20 border border-primary/40" : "bg-muted border border-border"
                }`}>
                  <span className={`text-[10px] font-bold ${isChosen ? "text-primary" : "text-muted-foreground"}`}>
                    {step.choices.indexOf(choice) + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{choice.label}</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    {choice.description}
                  </p>

                  {/* Effect tags — show on hover or when chosen */}
                  {(isChosen || isHovered) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {fx.skill_affinity && (
                        <Badge variant="outline" className="text-[7px] gap-0.5 border-primary/30 text-primary">
                          {SkillIcon && <SkillIcon className="h-2.5 w-2.5" />}
                          {fx.skill_affinity}
                        </Badge>
                      )}
                      {fx.personality_trait && (
                        <Badge variant="outline" className="text-[7px] border-accent/30 text-accent">
                          trait
                        </Badge>
                      )}
                      {fx.weakness && (
                        <Badge variant="outline" className="text-[7px] border-destructive/30 text-destructive">
                          flaw
                        </Badge>
                      )}
                      {fx.reputation_bias && Object.entries(fx.reputation_bias).map(([tag, val]) => (
                        <Badge key={tag} variant="outline" className={`text-[7px] ${val > 0 ? "border-status-ok/30 text-status-ok" : "border-status-danger/30 text-status-danger"}`}>
                          {tag} {val > 0 ? `+${val}` : val}
                        </Badge>
                      ))}
                      {fx.stat_modifiers && Object.entries(fx.stat_modifiers).filter(([,v]) => v !== 0).map(([key, val]) => (
                        <Badge key={key} variant="outline" className={`text-[7px] ${val > 0 ? "text-chart-4" : "text-status-warn"}`}>
                          {key.replace(/_/g, " ")} {val > 0 ? `+${val}` : val}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}