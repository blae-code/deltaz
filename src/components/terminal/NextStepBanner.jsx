import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * NextStepBanner — inline continuity cue that points the player to the next page in a workflow.
 * Keeps the player loop tight: "You're done here — go there next."
 *
 * @param {string} to - Route path
 * @param {ReactElement} icon - Lucide icon component
 * @param {string} label - Short CTA label
 * @param {string} hint - Contextual sentence explaining why
 * @param {"primary"|"accent"|"muted"} color
 */
export default function NextStepBanner({ to, icon: Icon, label, hint, color = "primary" }) {
  const colors = {
    primary: "border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary",
    accent: "border-accent/20 bg-accent/5 hover:bg-accent/10 text-accent",
    muted: "border-border bg-secondary/30 hover:bg-secondary/50 text-muted-foreground",
  };

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 border transition-all shadow-[inset_2px_0_0_0_transparent] hover:shadow-[inset_2px_0_0_0_currentColor] group ${colors[color] || colors.primary}`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-semibold tracking-wider uppercase leading-snug">{label}</span>
        {hint && <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{hint}</p>}
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}