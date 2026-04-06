import { useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../../hooks/useEntityQuery";
import DataCard from "../terminal/DataCard";
import EmptyState from "../terminal/EmptyState";
import ScheduledTaskForm from "./ScheduledTaskForm";
import ScheduledTaskCard from "./ScheduledTaskCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Clock, CheckCircle } from "lucide-react";

export default function SchedulerPanel({ userEmail }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("active");

  const tasksQuery = useEntityQuery(
    "scheduledTasks",
    () => base44.entities.ScheduledTask.list("-created_date", 100),
    { subscribeEntities: ["ScheduledTask"] }
  );
  const { data: tasks = [], isLoading } = tasksQuery;
  const refresh = () => tasksQuery.refetch();

  const filtered = tasks.filter(t => {
    if (filter === "active") return t.status === "active" || t.status === "paused";
    if (filter === "completed") return t.status === "completed" || t.status === "failed";
    return true;
  });

  const activeCount = tasks.filter(t => t.status === "active").length;
  const pausedCount = tasks.filter(t => t.status === "paused").length;
  const completedCount = tasks.filter(t => t.status === "completed" || t.status === "failed").length;

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          <FilterBtn active={filter === "active"} onClick={() => setFilter("active")} label="ACTIVE" count={activeCount + pausedCount} />
          <FilterBtn active={filter === "completed"} onClick={() => setFilter("completed")} label="DONE" count={completedCount} />
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} label="ALL" count={tasks.length} />
        </div>
        <Button
          variant={showForm ? "default" : "outline"}
          size="sm"
          className="h-7 text-[10px] uppercase tracking-wider ml-auto"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-3 w-3 mr-1" /> NEW TASK
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <DataCard title="Schedule New Task">
          <ScheduledTaskForm userEmail={userEmail} onCreated={() => { setShowForm(false); refresh(); }} />
        </DataCard>
      )}

      {/* Task list */}
      {isLoading && tasks.length === 0 ? (
        <div className="text-xs text-muted-foreground animate-pulse text-center py-6">Loading scheduled tasks...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={filter === "active" ? "No Active Tasks" : filter === "completed" ? "No Completed Tasks" : "No Tasks"}
          why="Scheduled tasks automate server maintenance like restarts, broadcasts, and timed events."
          action='Click "NEW TASK" to schedule your first automated action.'
        />
      ) : (
        <div className="grid gap-2">
          {filtered.map(task => (
            <ScheduledTaskCard key={task.id} task={task} onUpdate={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider border transition-colors ${
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {count > 0 && <Badge variant="outline" className="text-[8px] px-1 py-0 ml-0.5">{count}</Badge>}
    </button>
  );
}