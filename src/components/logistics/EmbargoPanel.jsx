import { AlertTriangle, Ban } from "lucide-react";

export default function EmbargoPanel({ embargoed }) {
  return (
    <div className="border border-status-danger/40 bg-status-danger/5 rounded-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Ban className="h-4 w-4 text-status-danger" />
        <span className="text-xs font-bold font-display tracking-wider text-status-danger uppercase">
          Active Trade Embargoes ({embargoed.length})
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {embargoed.map(e => (
          <div key={e.id} className="flex items-center gap-2 border border-status-danger/20 bg-card/50 rounded-sm px-3 py-2">
            <div
              className="h-3 w-3 rounded-full shrink-0 border border-white/10"
              style={{ backgroundColor: e.faction_color }}
            />
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-semibold text-foreground truncate block">
                {e.faction_tag} {e.faction_name}
              </span>
              <span className="text-[9px] text-status-danger/80 font-mono">
                EMBARGO ACTIVE — No trade routes
              </span>
            </div>
            <AlertTriangle className="h-3.5 w-3.5 text-status-danger shrink-0 ml-auto" />
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-2 font-mono">
        Embargoed factions cannot participate in commodity trade. Support missions may help resolve diplomatic tensions.
      </p>
    </div>
  );
}