import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home, Users } from "lucide-react";
import SettlementSvg from "../svg/SettlementSvg";

export default function TodayColony({ bases = [], survivors = [] }) {
  if (bases.length === 0) {
    return (
      <div className="text-center py-4">
        <SettlementSvg size={32} className="text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/70 italic">No bases registered yet.</p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">Register your first base in the Colony section.</p>
        <Link to="/colony">
          <Button variant="outline" size="sm" className="text-[10px] uppercase tracking-wider h-8 mt-2">
            <SettlementSvg size={14} className="mr-1" /> Go to Colony
          </Button>
        </Link>
      </div>
    );
  }

  const activeBases = bases.filter(b => b.status !== "abandoned" && b.status !== "destroyed");
  const assignedSurvivors = survivors.filter(s => bases.some(b => b.id === s.base_id));

  return (
    <div className="space-y-2.5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="panel-frame clip-corner-tr p-2.5 text-center">
          <div className="text-xl font-bold font-display text-primary">{activeBases.length}</div>
          <div className="text-[10px] text-muted-foreground/80 tracking-widest uppercase">Active Base{activeBases.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="panel-frame clip-corner-tr p-2.5 text-center">
          <div className="text-xl font-bold font-display text-foreground">{assignedSurvivors.length}</div>
          <div className="text-[10px] text-muted-foreground/80 tracking-widest uppercase">Survivors</div>
        </div>
      </div>

      {/* Base list (top 3) */}
      <div className="space-y-1">
        {activeBases.slice(0, 3).map(base => {
          const basesurvivors = survivors.filter(s => s.base_id === base.id);
          return (
            <div key={base.id} className="panel-frame flex items-center gap-2.5 px-3 py-2">
              <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{base.name || "Unnamed Base"}</p>
                <p className="text-[10px] text-muted-foreground">{base.sector || "Unknown sector"}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <Users className="h-3 w-3" />
                <span>{basesurvivors.length}</span>
              </div>
            </div>
          );
        })}
        {activeBases.length > 3 && (
          <p className="text-[10px] text-muted-foreground/60 text-center font-mono">+{activeBases.length - 3} more</p>
        )}
      </div>

      <Link to="/colony">
        <Button variant="outline" size="sm" className="w-full text-[10px] uppercase tracking-wider h-8">
          Colony Details <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </Link>
    </div>
  );
}