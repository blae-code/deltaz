import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Search, Wheat, Wrench, Shield, Heart, ChefHat, Cpu, ShoppingBag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TASKS = [
  { id: "scavenge", label: "SCAVENGE", icon: Search, desc: "Search for useful materials", bestSkill: "scavenger" },
  { id: "farm", label: "FARM", icon: Wheat, desc: "Grow food for the colony", bestSkill: "farmer" },
  { id: "craft", label: "CRAFT", icon: Cpu, desc: "Build tools and equipment", bestSkill: "engineer" },
  { id: "patrol", label: "PATROL", icon: Shield, desc: "Guard the perimeter (+defense)", bestSkill: "guard" },
  { id: "heal", label: "HEAL", icon: Heart, desc: "Treat the wounded", bestSkill: "medic" },
  { id: "cook", label: "COOK", icon: ChefHat, desc: "Prepare meals (+morale)", bestSkill: "cook" },
  { id: "repair", label: "REPAIR", icon: Wrench, desc: "Fix structures and gear", bestSkill: "mechanic" },
  { id: "trade", label: "TRADE", icon: ShoppingBag, desc: "Barter with passing caravans", bestSkill: "trader" },
];

export default function TaskAssigner({ survivors, onTaskAssigned }) {
  const [selectedSurvivor, setSelectedSurvivor] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  const idle = survivors.filter(s => s.status === "active" && (!s.current_task || s.current_task === "idle"));
  const busy = survivors.filter(s => s.status === "active" && s.current_task && s.current_task !== "idle");

  const handleAssign = async (taskType) => {
    if (!selectedSurvivor) return;
    setAssigning(true);
    const res = await base44.functions.invoke("settlementSim", {
      action: "assign_task",
      survivor_id: selectedSurvivor.id,
      task_type: taskType,
    });
    if (res.data.status === "ok") {
      toast({ title: `${selectedSurvivor.name} assigned to ${taskType}` });
      setSelectedSurvivor(null);
      onTaskAssigned?.();
    } else {
      toast({ title: "Failed", description: res.data.error, variant: "destructive" });
    }
    setAssigning(false);
  };

  return (
    <div className="space-y-3">
      {/* Busy survivors */}
      {busy.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">CURRENTLY WORKING ({busy.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {busy.map(s => (
              <Badge key={s.id} variant="outline" className="text-[9px] gap-1 bg-primary/5 border-primary/20">
                {s.name} → {s.current_task}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Idle survivors */}
      <div className="space-y-1.5">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">AVAILABLE ({idle.length})</div>
        {idle.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">All survivors are busy or incapacitated.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {idle.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSurvivor(s)}
                className={`text-left px-2.5 py-2 rounded-sm border transition-colors text-[10px] ${
                  selectedSurvivor?.id === s.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/30"
                }`}
              >
                <div className="font-semibold truncate">{s.name}</div>
                <div className="text-[8px] text-muted-foreground">{s.skill} Lv.{s.skill_level}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task grid */}
      {selectedSurvivor && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
            ASSIGN {selectedSurvivor.name} TO:
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {TASKS.map(task => {
              const isMatch = task.bestSkill === selectedSurvivor.skill;
              const TaskIcon = task.icon;
              return (
                <button
                  key={task.id}
                  onClick={() => handleAssign(task.id)}
                  disabled={assigning}
                  className={`text-left px-2.5 py-2 rounded-sm border transition-colors ${
                    isMatch
                      ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                      : "border-border bg-secondary/20 hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {assigning ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : <TaskIcon className={`h-3 w-3 ${isMatch ? "text-primary" : "text-muted-foreground"}`} />}
                    <span className={`text-[10px] font-semibold tracking-wider ${isMatch ? "text-primary" : "text-foreground"}`}>
                      {task.label}
                    </span>
                    {isMatch && <Badge className="text-[7px] h-3 px-1 bg-primary/20 text-primary border-0">MATCH</Badge>}
                  </div>
                  <p className="text-[8px] text-muted-foreground mt-0.5">{task.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}