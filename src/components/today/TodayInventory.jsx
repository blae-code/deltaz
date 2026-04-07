import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hammer, ChevronRight, ArrowLeftRight } from "lucide-react";
import GearCrateSvg from "../svg/GearCrateSvg";
import NextStepBanner from "../terminal/NextStepBanner";

export default function TodayInventory({ inventory, craftingProjects }) {
  const equipped = inventory.filter(i => i.is_equipped);
  const totalItems = inventory.length;
  const lowCondition = inventory.filter(i => (i.condition ?? 100) < 30);

  if (totalItems === 0 && (!craftingProjects || craftingProjects.length === 0)) {
    return (
      <div className="text-center py-4">
        <GearCrateSvg size={32} className="text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/60 italic">No gear logged yet.</p>
        <p className="text-[10px] text-muted-foreground/40 mt-1">Head to the Gear Locker to add items manually, scan a screenshot, or paste a list.</p>
      </div>
    );
  }

  const activeProjects = (craftingProjects || []).filter(p => p.status === "gathering" || p.status === "ready");
  const readyProjects = activeProjects.filter(p => p.status === "ready");

  return (
    <div className="space-y-3">
      {/* Gear summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-border rounded-sm p-2.5 text-center">
          <div className="text-lg font-bold font-display text-primary">{totalItems}</div>
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Items</div>
        </div>
        <div className="border border-border rounded-sm p-2.5 text-center">
          <div className="text-lg font-bold font-display text-foreground">{equipped.length}</div>
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Equipped</div>
        </div>
        <div className={`border rounded-sm p-2.5 text-center ${lowCondition.length > 0 ? "border-accent/40 bg-accent/5" : "border-border"}`}>
          <div className={`text-lg font-bold font-display ${lowCondition.length > 0 ? "text-accent" : "text-foreground"}`}>{lowCondition.length}</div>
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Degraded</div>
        </div>
      </div>

      {/* Active crafting */}
      {activeProjects.length > 0 && (
        <div>
          <h4 className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1.5 font-mono">
            CRAFTING ({activeProjects.length} active)
          </h4>
          <div className="space-y-1">
            {activeProjects.slice(0, 3).map(p => {
              const total = (p.materials || []).length;
              const done = (p.materials || []).filter(m => (m.have || 0) >= (m.needed || 1)).length;
              return (
                <div key={p.id} className="flex items-center gap-2.5 border border-border rounded-sm px-3 py-2">
                  <Hammer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.status === "ready" ? "bg-status-ok" : "bg-primary"}`}
                          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">{done}/{total}</span>
                    </div>
                  </div>
                  {p.status === "ready" && (
                    <Badge className="text-[10px] bg-status-ok/20 text-status-ok border-0 shrink-0">READY</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Continuity cues */}
      {lowCondition.length > 0 && (
        <NextStepBanner
          to="/trade"
          icon={ArrowLeftRight}
          label="Need replacements?"
          hint={`${lowCondition.length} degraded item${lowCondition.length > 1 ? "s" : ""} — check the Trade Hub for gear.`}
          color="accent"
        />
      )}

      {/* Quick links */}
      <div className="flex gap-1.5">
        <Link to="/inventory" className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-[10px] uppercase tracking-wider h-8">
            <GearCrateSvg size={14} className="mr-1" /> Inventory
          </Button>
        </Link>
        <Link to="/workbench" className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-[10px] uppercase tracking-wider h-8">
            <Hammer className="h-3 w-3 mr-1" /> Workbench
            {readyProjects.length > 0 && (
              <Badge className="ml-1.5 text-[10px] bg-status-ok/20 text-status-ok border-0 px-1.5 py-0">{readyProjects.length}</Badge>
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}