import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import InlineConfirm from "../terminal/InlineConfirm";
import {
  Play, Pause, Trash2, RefreshCw, Radio, Terminal, Zap,
  Clock, CalendarClock, Loader2
} from "lucide-react";
import moment from "moment";

const TYPE_CONFIG = {
  restart: { icon: RefreshCw, label: "RESTART", color: "text-accent" },
  broadcast: { icon: Radio, label: "BROADCAST", color: "text-primary" },
  rcon_command: { icon: Terminal, label: "RCON", color: "text-muted-foreground" },
  event_start: { icon: Zap, label: "EVENT START", color: "text-status-ok" },
  event_end: { icon: Zap, label: "EVENT END", color: "text-status-warn" },
};

const STATUS_STYLE = {
  active: "bg-status-ok/15 text-status-ok border-status-ok/30",
  paused: "bg-muted text-muted-foreground border-border",
  completed: "bg-primary/15 text-primary border-primary/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function ScheduledTaskCard({ task, onUpdate }) {
  const [acting, setActing] = useState(false);
  const { toast } = useToast();

  const config = TYPE_CONFIG[task.task_type] || TYPE_CONFIG.rcon_command;
  const Icon = config.icon;
  const payload = safeJSON(task.payload);
  const isFinished = task.status === "completed" || task.status === "failed";

  const toggle = async () => {
    setActing(true);
    const newStatus = task.status === "active" ? "paused" : "active";
    await base44.entities.ScheduledTask.update(task.id, { status: newStatus });
    toast({ title: newStatus === "active" ? "Task Resumed" : "Task Paused" });
    setActing(false);
    onUpdate?.();
  };

  const remove = async () => {
    await base44.entities.ScheduledTask.delete(task.id);
    toast({ title: "Task Deleted", description: task.name });
    onUpdate?.();
  };

  const runNow = async () => {
    setActing(true);
    await base44.functions.invoke("executeScheduledTask", {});
    toast({ title: "Executor Triggered", description: "Checking all due tasks now..." });
    setActing(false);
    onUpdate?.();
  };

  return (
    <div className={`border rounded-sm bg-card overflow-hidden ${task.status === "paused" ? "opacity-60" : ""}`}>
      <div className="px-3 py-2.5 space-y-1.5">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className={`h-3.5 w-3.5 ${config.color} shrink-0`} />
          <span className="text-xs font-semibold text-foreground">{task.name}</span>
          <Badge variant="outline" className={`text-[8px] uppercase px-1 py-0 ${config.color}`}>{config.label}</Badge>
          <Badge className={`text-[8px] uppercase px-1.5 py-0 border ${STATUS_STYLE[task.status]}`}>{task.status}</Badge>
        </div>

        {/* Schedule info */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          {task.schedule_type === "once" ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.run_at ? moment(task.run_at).format("MMM D, HH:mm") : "No time set"}
              {task.run_at && ` (${moment(task.run_at).fromNow()})`}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              <code className="bg-secondary px-1 rounded text-[9px]">{task.cron_expression}</code>
            </span>
          )}

          {task.run_count > 0 && (
            <span>Runs: {task.run_count}{task.max_runs > 0 ? `/${task.max_runs}` : ""}</span>
          )}

          {task.warn_minutes_before > 0 && (
            <span className="text-accent">⚠ {task.warn_minutes_before}min warning</span>
          )}

          {task.last_run_at && (
            <span>Last: {moment(task.last_run_at).fromNow()}</span>
          )}
        </div>

        {/* Payload summary */}
        <div className="text-[10px] text-muted-foreground/70">
          {payload.message && <span>📢 "{payload.message.slice(0, 80)}{payload.message.length > 80 ? "..." : ""}"</span>}
          {payload.command && <span>⌨ <code>{payload.command}</code></span>}
          {payload.rcon_command && <span>⌨ <code>{payload.rcon_command}</code></span>}
          {payload.broadcast_message && !payload.message && <span>📢 "{payload.broadcast_message.slice(0, 60)}"</span>}
        </div>

        {/* Last run result */}
        {task.last_run_result && task.last_run_result !== "success" && !task.last_run_result.startsWith("warned:") && (
          <div className="text-[9px] text-destructive/80 bg-destructive/5 px-2 py-1 rounded-sm">
            {task.last_run_result}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 pt-1">
          {!isFinished && (
            <Button variant="outline" size="sm" className="h-6 text-[9px] uppercase tracking-wider" onClick={toggle} disabled={acting}>
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : task.status === "active" ? <><Pause className="h-3 w-3 mr-0.5" /> PAUSE</> : <><Play className="h-3 w-3 mr-0.5" /> RESUME</>}
            </Button>
          )}
          <InlineConfirm
            variant="ghost"
            size="sm"
            className="h-6 text-[9px] uppercase tracking-wider text-destructive/60 hover:text-destructive"
            confirmLabel="DELETE TASK"
            warning={`"${task.name}" will be permanently removed.`}
            severity="danger"
            onConfirm={remove}
          >
            <Trash2 className="h-3 w-3 mr-0.5" /> DELETE
          </InlineConfirm>
        </div>
      </div>
    </div>
  );
}

function safeJSON(str) {
  if (!str) return {};
  try { return JSON.parse(str); } catch { return {}; }
}