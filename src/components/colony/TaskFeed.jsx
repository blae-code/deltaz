import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const statusConfig = {
  active: { icon: Clock, color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  completed: { icon: CheckCircle, color: "text-status-ok", bg: "bg-status-ok/10 border-status-ok/20" },
  failed: { icon: XCircle, color: "text-status-danger", bg: "bg-status-danger/10 border-status-danger/20" },
  interrupted: { icon: AlertTriangle, color: "text-status-warn", bg: "bg-status-warn/10 border-status-warn/20" },
};

const qualityColor = {
  poor: "text-status-danger",
  standard: "text-muted-foreground",
  good: "text-primary",
  excellent: "text-accent",
};

export default function TaskFeed({ baseId, onRefresh }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const { toast } = useToast();

  const loadTasks = () => {
    setLoading(true);
    base44.entities.SurvivorTask.filter({ base_id: baseId }, "-created_date", 30)
      .then(setTasks)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (baseId) loadTasks();
  }, [baseId]);

  useEffect(() => {
    const unsub = base44.entities.SurvivorTask.subscribe((ev) => {
      if (ev.type === "create" && ev.data.base_id === baseId) {
        setTasks(prev => [ev.data, ...prev]);
      } else if (ev.type === "update") {
        setTasks(prev => prev.map(t => t.id === ev.id ? ev.data : t));
      }
    });
    return unsub;
  }, [baseId]);

  const activeTasks = tasks.filter(t => t.status === "active");

  const handleResolve = async () => {
    setResolving(true);
    const res = await base44.functions.invoke("settlementSim", { action: "resolve_tasks" });
    if (res.data.resolved > 0) {
      toast({ title: `${res.data.resolved} task(s) resolved` });
      loadTasks();
      onRefresh?.();
    } else {
      toast({ title: "No tasks ready to resolve yet" });
    }
    setResolving(false);
  };

  if (loading) {
    return <div className="text-[10px] text-muted-foreground animate-pulse py-4 text-center">Loading task log...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Resolve button */}
      {activeTasks.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-accent font-mono">{activeTasks.length} task(s) in progress</span>
          <Button size="sm" variant="outline" className="h-6 text-[9px] font-mono" onClick={handleResolve} disabled={resolving}>
            {resolving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            RESOLVE TASKS
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">No task history. Assign survivors to get started.</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {tasks.map(task => {
            const cfg = statusConfig[task.status] || statusConfig.active;
            const StatusIcon = cfg.icon;
            return (
              <div key={task.id} className={`border rounded-sm p-2.5 ${cfg.bg}`}>
                <div className="flex items-start gap-2">
                  <StatusIcon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-foreground">{task.survivor_name}</span>
                      <Badge variant="outline" className="text-[8px] uppercase">{task.task_type}</Badge>
                      {task.quality && task.status !== "active" && (
                        <span className={`text-[8px] font-mono ${qualityColor[task.quality] || ""}`}>
                          [{task.quality}]
                        </span>
                      )}
                    </div>
                    {task.outcome_summary && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">{task.outcome_summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[8px] text-muted-foreground">
                      {task.started_at && <span>{moment(task.started_at).fromNow()}</span>}
                      {task.credits_gained > 0 && <span className="text-primary">+{task.credits_gained}cr</span>}
                      {task.defense_contributed > 0 && <span className="text-accent">+{task.defense_contributed} def</span>}
                      {task.resources_gained && <span className="truncate max-w-[120px]">{task.resources_gained}</span>}
                      {task.injury_caused && <span className="text-status-danger">⚠ injured</span>}
                      {task.interrupted_by && <span className="text-status-warn">↯ {task.interrupted_by}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}