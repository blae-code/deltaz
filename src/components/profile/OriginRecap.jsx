import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { ORIGIN_STEPS } from "../onboarding/originSteps";
import { Skull, ChevronDown, ChevronUp, Shield, Swords, Heart, Search, Wrench, ShoppingBag, Cpu, Target } from "lucide-react";

const statIcons = {
  combat_rating: Swords, defense_bonus: Shield, healing_bonus: Heart,
  scavenge_bonus: Search, repair_bonus: Wrench, crafting_bonus: Cpu,
  trade_bonus: ShoppingBag, morale_bonus: Target,
};

export default function OriginRecap({ userEmail }) {
  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, [userEmail]);

  const choices = user?.origin_choices;
  const compiled = user?.origin_compiled;

  if (!choices || !compiled || choices.length === 0) return null;

  // Match each choice back to the step data for full narrative
  const storySteps = choices.map((choice, i) => {
    const stepDef = ORIGIN_STEPS[i];
    const choiceDef = stepDef?.choices?.find(c => c.id === choice.id);
    return { stepDef, choiceDef, choice };
  }).filter(s => s.stepDef && s.choiceDef);

  return (
    <DataCard
      title="Origin Story"
      headerRight={
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[9px] text-primary tracking-wider hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "COLLAPSE" : "EXPAND"}
        </button>
      }
    >
      <div className="space-y-3">
        {/* Summary line */}
        <div className="flex items-center gap-2">
          <Skull className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-foreground">
            <span className="text-primary font-semibold">{compiled.origin_tags?.map(t => t.replace(/_/g, " ")).join(" · ") || "Survivor"}</span>
            {" — "}{compiled.primary_skill} specialist
          </p>
        </div>

        {/* Origin tags + faction */}
        <div className="flex flex-wrap gap-1">
          {compiled.origin_tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-[8px] capitalize">{tag.replace(/_/g, " ")}</Badge>
          ))}
          {compiled.faction_loyalty && (
            <Badge className="text-[8px] bg-accent/10 text-accent border-accent/20">{compiled.faction_loyalty.split("—")[0].trim()}</Badge>
          )}
          {compiled.goal && (
            <Badge variant="outline" className="text-[8px] text-chart-4 border-chart-4/20">{compiled.goal}</Badge>
          )}
        </div>

        {/* Stats compact */}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(compiled.stat_modifiers || {}).filter(([,v]) => v !== 0).map(([key, val]) => {
            const Icon = statIcons[key] || Target;
            return (
              <div key={key} className="flex items-center gap-1 bg-secondary/50 rounded-sm px-2 py-1">
                <Icon className="h-2.5 w-2.5 text-primary" />
                <span className={`text-[9px] font-mono font-bold ${val > 0 ? "text-status-ok" : "text-status-danger"}`}>
                  {val > 0 ? `+${val}` : val}
                </span>
                <span className="text-[7px] text-muted-foreground">{key.replace(/_/g, " ")}</span>
              </div>
            );
          })}
        </div>

        {/* Expanded: Full story walkthrough */}
        {expanded && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            {storySteps.map(({ stepDef, choiceDef, choice }, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-[10px] text-primary font-display tracking-widest uppercase font-bold">
                  {stepDef.title}
                </p>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                  {stepDef.narrative}
                </p>
                <div className="border-l-2 border-primary/30 pl-3 py-1">
                  <p className="text-xs text-foreground font-semibold">{choiceDef.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    {choiceDef.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Personality + Weaknesses */}
            {compiled.personality_traits?.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Forged Personality</p>
                {compiled.personality_traits.map((t, i) => (
                  <p key={i} className="text-[10px] text-foreground">• {t}</p>
                ))}
              </div>
            )}
            {compiled.weaknesses?.length > 0 && (
              <div>
                <p className="text-[9px] text-destructive/80 uppercase tracking-wider mb-1">Scars & Flaws</p>
                {compiled.weaknesses.map((w, i) => (
                  <p key={i} className="text-[10px] text-destructive/70">• {w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DataCard>
  );
}