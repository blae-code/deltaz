import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

const statusStyles = {
  neutral: "text-muted-foreground",
  allied: "text-primary",
  trade_agreement: "text-chart-4",
  ceasefire: "text-accent",
  hostile: "text-destructive",
  war: "text-destructive font-bold",
};

export default function DiplomacyLog({ relations, factions }) {
  const getFaction = (id) => factions.find((f) => f.id === id);

  // Show most recent changes
  const sorted = [...relations]
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 10);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          DIPLOMATIC HISTORY
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
        {sorted.map((r) => {
          const fA = getFaction(r.faction_a_id);
          const fB = getFaction(r.faction_b_id);
          return (
            <div key={r.id} className="px-3 py-2 flex items-center gap-2 text-[10px]">
              <span className="text-[9px] text-muted-foreground w-16 shrink-0">
                {moment(r.updated_date).fromNow()}
              </span>
              <span className="font-semibold" style={{ color: fA?.color }}>{fA?.tag || "?"}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-semibold" style={{ color: fB?.color }}>{fB?.tag || "?"}</span>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {r.previous_status && r.previous_status !== r.status && (
                  <>
                    <span className={`uppercase ${statusStyles[r.previous_status] || ""}`}>
                      {r.previous_status.replace("_", " ")}
                    </span>
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <span className={`uppercase font-semibold ${statusStyles[r.status] || ""}`}>
                  {r.status.replace("_", " ")}
                </span>
              </div>
              {r.terms && (
                <span className="text-muted-foreground truncate max-w-32" title={r.terms}>
                  {r.terms}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}