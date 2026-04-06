import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, CheckCircle, Wheat, Search, Heart, Shield, ChefHat } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TASK_META = {
  farm:     { icon: Wheat,    label: "Farm",    desc: "Grow food to replenish reserves", bestSkill: "farmer" },
  cook:     { icon: ChefHat,  label: "Cook",    desc: "Prepare meals for the colony",    bestSkill: "cook" },
  scavenge: { icon: Search,   label: "Scavenge", desc: "Search for water and supplies",  bestSkill: "scavenger" },
  heal:     { icon: Heart,    label: "Heal",    desc: "Treat wounded and restock medical", bestSkill: "medic" },
  patrol:   { icon: Shield,   label: "Patrol",  desc: "Fortify defenses and watch perimeter", bestSkill: "guard" },
  defend:   { icon: Shield,   label: "Defend",  desc: "Man defensive posts",              bestSkill: "guard" },
};

export default function ResourceAllocationPanel({ resource, taskTypes, survivors, onClose, onTaskAssigned }) {
  const [assigning, setAssigning] = useState(null);
  const [assigned, setAssigned] = useState([]);
  const { toast } = useToast();

  const idle = survivors.filter(s => s.status === "active" && (!s.current_task || s.current_task === "idle"));

  // Sort: best-skill matches first
  const bestSkills = taskTypes.map(t => TASK_META[t]?.bestSkill).filter(Boolean);
  const sorted = [...idle].sort((a, b) => {
    const aMatch = bestSkills.includes(a.skill) ? -1 : 0;
    const bMatch = bestSkills.includes(b.skill) ? -1 : 0;
    return aMatch - bMatch;
  });

  const handleAssign = async (survivor, taskType) => {
    setAssigning(survivor.id);
    const res = await base44.functions.invoke("settlementSim", {
      action: "assign_task",
      survivor_id: survivor.id,
      task_type: taskType,
    });
    if (res.data.status === "ok") {
      toast({ title: `${survivor.name} assigned to ${taskType}` });
      setAssigned(prev => [...prev, survivor.id]);
      onTaskAssigned?.();
    } else {
      toast({ title: "Failed", description: res.data.error, variant: "destructive" });
    }
    setAssigning(null);
  };

  const resourceLabel = resource.charAt(0).toUpperCase() + resource.slice(1);

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-primary/20">
        <span className="text-[10px] font-bold font-display text-primary uppercase tracking-wider">
          ⚡ ALLOCATE RESOURCES — {resourceLabel}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Task type buttons */}
        <div className="flex flex-wrap gap-1.5">
          {taskTypes.map(t => {
            const meta = TASK_META[t];
            if (!meta) return null;
            const TaskIcon = meta.icon;
            return (
              <div key={t} className="border border-border rounded-sm px-2.5 py-1.5 bg-card flex items-center gap-1.5">
                <TaskIcon className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-mono text-foreground uppercase">{meta.label}</span>
                <span className="text-[8px] text-muted-foreground">— {meta.desc}</span>
              </div>
            );
          })}
        </div>

        {/* Idle survivors */}
        {sorted.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-3">
            No idle survivors available. Reassign busy ones from the Task Assignment panel.
          </p>
        ) : (
          <div className="space-y-1">
            <div className="text-[9px] text-muted-foreground tracking-widest uppercase font-mono">
              IDLE SURVIVORS ({sorted.length})
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sorted.map(s => {
                const isAssigned = assigned.includes(s.id);
                const isMatch = bestSkills.includes(s.skill);

                return (
                  <div key={s.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-sm border transition-colors ${
                    isAssigned ? "border-status-ok/30 bg-status-ok/5" : isMatch ? "border-primary/20 bg-primary/5" : "border-border bg-card"
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-foreground">{s.name}</span>
                        <span className="text-[8px] text-muted-foreground font-mono">{s.skill} Lv.{s.skill_level || 1}</span>
                        {isMatch && <Badge className="text-[7px] h-3 px-1 bg-primary/20 text-primary border-0">MATCH</Badge>}
                      </div>
                    </div>

                    {isAssigned ? (
                      <CheckCircle className="h-3.5 w-3.5 text-status-ok shrink-0" />
                    ) : (
                      <div className="flex gap-1 shrink-0">
                        {taskTypes.map(t => {
                          const meta = TASK_META[t];
                          if (!meta) return null;
                          return (
                            <Button
                              key={t}
                              size="sm"
                              variant="outline"
                              className="h-6 text-[8px] font-mono px-2"
                              disabled={assigning === s.id}
                              onClick={() => handleAssign(s, t)}
                            >
                              {assigning === s.id ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                meta.label.toUpperCase()
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}