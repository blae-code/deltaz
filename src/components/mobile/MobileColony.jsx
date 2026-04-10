import MobileSummaryCard from "./MobileSummaryCard";
import MobileKpiRow from "./MobileKpiRow";
import { Home, Users, Wrench, Shield } from "lucide-react";

export default function MobileColony({ bases, survivors, modules, user, selectedBaseId, onSelectBase }) {
  const myBases = bases.filter(b => b.owner_email === user?.email);
  const totalSurvivors = survivors.filter(
    s => s.status === "active" && myBases.some(b => b.id === s.base_id)
  ).length;

  const kpis = [
    { label: "BASES", value: myBases.length, color: "text-primary" },
    { label: "SURVIVORS", value: totalSurvivors, color: "text-accent" },
    { label: "CAPACITY", value: `${totalSurvivors}/${myBases.reduce((s, b) => s + (b.capacity || 5), 0)}`, color: "text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <MobileKpiRow items={kpis} />

      {myBases.length === 0 ? (
        <div className="text-center py-8 text-[10px] text-muted-foreground/50 font-mono">
          NO BASES ESTABLISHED — CLAIM YOUR FIRST SETTLEMENT
        </div>
      ) : (
        <div className="space-y-1.5">
          {myBases.map(base => {
            const baseSurvivors = survivors.filter(s => s.base_id === base.id && s.status === "active");
            const baseModules = modules.filter(m => m.base_id === base.id && m.status !== "destroyed");
            const working = baseSurvivors.filter(s => s.current_task && s.current_task !== "idle").length;
            const isSelected = selectedBaseId === base.id;

            return (
              <MobileSummaryCard
                key={base.id}
                icon={<Home className={`h-4 w-4 ${isSelected ? "text-primary" : ""}`} />}
                title={base.name}
                subtitle={`${base.sector || "?"} · DEF ${base.defense_level || 1}`}
                onClick={() => onSelectBase(base.id)}
                status={base.status?.toUpperCase()}
                statusColor={isSelected ? "text-primary" : "text-muted-foreground"}
              >
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {baseSurvivors.length}/{base.capacity || 5}
                  </span>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> {baseModules.length} mods
                  </span>
                  {working > 0 && (
                    <span className="text-[9px] text-status-ok flex items-center gap-1">
                      <Shield className="h-3 w-3" /> {working} working
                    </span>
                  )}
                </div>
              </MobileSummaryCard>
            );
          })}
        </div>
      )}
    </div>
  );
}