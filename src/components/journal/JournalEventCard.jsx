import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Zap, AlertTriangle, Eye, Sparkles, Loader2 } from "lucide-react";

const catIcons = {
  encounter: BookOpen,
  discovery: Eye,
  dilemma: AlertTriangle,
  crisis: Zap,
  opportunity: Sparkles,
};

const catColors = {
  encounter: "text-primary border-primary/30",
  discovery: "text-chart-4 border-chart-4/30",
  dilemma: "text-accent border-accent/30",
  crisis: "text-status-danger border-status-danger/30",
  opportunity: "text-status-ok border-status-ok/30",
};

export default function JournalEventCard({ entry, onChoice, resolved }) {
  const [choosing, setChoosing] = useState(null);
  const Icon = catIcons[entry.category] || BookOpen;
  const color = catColors[entry.category] || "text-muted-foreground border-border";

  const handleChoice = async (choiceId) => {
    setChoosing(choiceId);
    await onChoice?.(entry.id, choiceId);
    setChoosing(null);
  };

  return (
    <div className={`border rounded-sm overflow-hidden ${resolved ? "border-border bg-card" : `border-border bg-card`}`}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 bg-secondary/30">
        <div className={`p-1 rounded-sm border ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold font-display tracking-wider text-foreground uppercase truncate">
            {entry.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={`text-[8px] uppercase ${color}`}>{entry.category}</Badge>
            {resolved && entry.chosen_label && (
              <Badge className="text-[8px] bg-primary/10 text-primary border-0">CHOSE: {entry.chosen_label}</Badge>
            )}
          </div>
        </div>
        <span className="text-[8px] text-muted-foreground font-mono shrink-0">
          {new Date(entry.created_date).toLocaleDateString()}
        </span>
      </div>

      {/* Narrative */}
      <div className="px-4 py-3">
        <p className="text-[11px] text-foreground/90 leading-relaxed">{entry.narrative}</p>
      </div>

      {/* Choices or Outcome */}
      {!resolved && entry.choices?.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          <div className="text-[9px] text-muted-foreground tracking-widest uppercase">YOUR CHOICE</div>
          {entry.choices.map(choice => (
            <Button
              key={choice.id}
              variant="outline"
              className="w-full justify-start h-auto py-2 px-3 text-left"
              onClick={() => handleChoice(choice.id)}
              disabled={choosing !== null}
            >
              {choosing === choice.id ? (
                <Loader2 className="h-3 w-3 animate-spin mr-2 shrink-0" />
              ) : (
                <div className="h-3 w-3 rounded-full border border-primary/40 mr-2 shrink-0" />
              )}
              <div>
                <div className="text-[10px] font-semibold text-foreground">{choice.label}</div>
                {choice.effect_description && (
                  <div className="text-[9px] text-muted-foreground mt-0.5">{choice.effect_description}</div>
                )}
              </div>
            </Button>
          ))}
        </div>
      )}

      {resolved && entry.outcome && (
        <div className="px-4 pb-3 border-t border-border/50 pt-3">
          <div className="text-[9px] text-primary tracking-widest uppercase mb-1">OUTCOME</div>
          <p className="text-[10px] text-muted-foreground leading-relaxed italic">{entry.outcome}</p>
          {entry.reputation_effect?.delta && (
            <div className="mt-2">
              <Badge variant="outline" className={`text-[8px] ${entry.reputation_effect.delta > 0 ? "text-status-ok border-status-ok/30" : "text-status-danger border-status-danger/30"}`}>
                REP: {entry.reputation_effect.delta > 0 ? "+" : ""}{entry.reputation_effect.delta}
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}