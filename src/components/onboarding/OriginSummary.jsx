import { Badge } from "@/components/ui/badge";
import { compileOriginEffects } from "./originSteps";
import { Shield, Swords, Heart, Search, Wrench, ShoppingBag, Cpu, Target } from "lucide-react";

const statIcons = {
  combat_rating: Swords,
  defense_bonus: Shield,
  healing_bonus: Heart,
  scavenge_bonus: Search,
  repair_bonus: Wrench,
  crafting_bonus: Cpu,
  trade_bonus: ShoppingBag,
  morale_bonus: Target,
};

export default function OriginSummary({ choices, callsign }) {
  if (choices.length === 0) return null;
  const compiled = compileOriginEffects(choices);

  return (
    <div className="border border-primary/20 bg-primary/5 rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-primary tracking-widest font-mono uppercase font-semibold">
          OPERATIVE DOSSIER
        </p>
        <Badge className="text-[8px] bg-primary/20 text-primary border-0">
          {compiled.primary_skill}
        </Badge>
      </div>

      {callsign && (
        <p className="text-sm font-bold text-foreground font-display tracking-wider">
          {callsign}
        </p>
      )}

      {/* Origin tags */}
      {compiled.origin_tags.length > 0 && (
        <div className="flex gap-1">
          {compiled.origin_tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[8px] capitalize">
              {tag.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      {/* Personality */}
      {compiled.personality_traits.length > 0 && (
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Personality</p>
          <div className="space-y-0.5">
            {compiled.personality_traits.map((t, i) => (
              <p key={i} className="text-[10px] text-foreground">• {t}</p>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {compiled.weaknesses.length > 0 && (
        <div>
          <p className="text-[9px] text-destructive/80 uppercase tracking-wider mb-1">Flaws</p>
          <div className="space-y-0.5">
            {compiled.weaknesses.map((w, i) => (
              <p key={i} className="text-[10px] text-destructive/70">• {w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Faction loyalty */}
      {compiled.faction_loyalty && (
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Faction Loyalty</p>
          <p className="text-[10px] text-accent">{compiled.faction_loyalty}</p>
        </div>
      )}

      {/* Goal */}
      {compiled.goal && (
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Drive</p>
          <p className="text-[10px] text-foreground italic">{compiled.goal}</p>
        </div>
      )}

      {/* Stat modifiers */}
      <div className="grid grid-cols-4 gap-1.5">
        {Object.entries(compiled.stat_modifiers)
          .filter(([, v]) => v !== 0)
          .map(([key, val]) => {
            const Icon = statIcons[key] || Target;
            return (
              <div key={key} className="bg-secondary/50 rounded-sm p-1.5 text-center">
                <Icon className="h-3 w-3 mx-auto text-primary mb-0.5" />
                <div className={`text-[10px] font-bold font-mono ${val > 0 ? "text-status-ok" : "text-status-danger"}`}>
                  {val > 0 ? `+${val}` : val}
                </div>
                <div className="text-[7px] text-muted-foreground truncate">{key.replace(/_/g, " ")}</div>
              </div>
            );
          })}
      </div>

      {/* Reputation biases */}
      {Object.keys(compiled.reputation_biases).length > 0 && (
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Starting Reputation</p>
          <div className="flex gap-1.5">
            {Object.entries(compiled.reputation_biases).map(([tag, val]) => (
              <Badge key={tag} className={`text-[8px] ${val > 0 ? "bg-status-ok/10 text-status-ok border-status-ok/20" : "bg-status-danger/10 text-status-danger border-status-danger/20"}`}>
                {tag}: {val > 0 ? `+${val}` : val}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}