import { Badge } from "@/components/ui/badge";
import { GitBranch, Radio, AlertTriangle, Map } from "lucide-react";
import moment from "moment";

export default function JournalTimeline({ entries }) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">No resolved events to show in the timeline.</p>;
  }

  // Sort oldest first for chronological timeline
  const sorted = [...entries].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  return (
    <div className="relative pl-6 space-y-4">
      {/* Vertical line */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

      {sorted.map((entry, idx) => (
        <div key={entry.id} className="relative">
          {/* Dot */}
          <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background z-10" />

          <div className="border border-border bg-card rounded-sm p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold font-display tracking-wider text-foreground uppercase truncate">
                {entry.title}
              </span>
              <span className="text-[8px] text-muted-foreground font-mono shrink-0">
                {moment(entry.created_date).format("MMM D")}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[8px] uppercase">{entry.category}</Badge>
              {entry.chosen_label && (
                <span className="text-[9px] text-primary font-mono">→ {entry.chosen_label}</span>
              )}
              {entry.reputation_effect?.delta && (
                <Badge variant="outline" className={`text-[8px] ${entry.reputation_effect.delta > 0 ? "text-status-ok" : "text-status-danger"}`}>
                  REP {entry.reputation_effect.delta > 0 ? "+" : ""}{entry.reputation_effect.delta}
                </Badge>
              )}
            </div>

            {entry.outcome && (
              <p className="text-[9px] text-muted-foreground italic line-clamp-2">{entry.outcome}</p>
            )}
            {entry.world_effects?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {entry.world_effects.map((we, wi) => (
                  <Badge key={wi} variant="outline" className="text-[7px] text-accent border-accent/30">
                    {we.type === 'intel_created' ? '📡' : we.type === 'event_created' ? '📢' : '⚡'} {we.description}
                  </Badge>
                ))}
              </div>
            )}
            {entry.chain_depth > 0 && (
              <Badge variant="outline" className="text-[7px] text-chart-4 border-chart-4/30 mt-1">
                <GitBranch className="h-2.5 w-2.5 mr-0.5" /> Chain depth {entry.chain_depth}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}