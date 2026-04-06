import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2 } from "lucide-react";

const TASK_TYPES = [
  { value: "restart", label: "Server Restart", hint: "Restarts the game server via Pterodactyl" },
  { value: "broadcast", label: "World Broadcast", hint: "Sends a message to all online players via RCON" },
  { value: "rcon_command", label: "RCON Command", hint: "Executes an arbitrary RCON command" },
  { value: "event_start", label: "Event Start", hint: "Triggers a server event (RCON + optional broadcast)" },
  { value: "event_end", label: "Event End", hint: "Ends a server event (cleanup RCON + optional broadcast)" },
];

const CRON_PRESETS = [
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at 4am UTC", value: "0 4 * * *" },
  { label: "Daily at noon UTC", value: "0 12 * * *" },
  { label: "Every Monday 6am UTC", value: "0 6 * * 1" },
  { label: "Every 30 min", value: "*/30 * * * *" },
  { label: "Custom", value: "custom" },
];

export default function ScheduledTaskForm({ userEmail, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    task_type: "restart",
    schedule_type: "once",
    run_at: "",
    cron_preset: "0 4 * * *",
    cron_custom: "",
    message: "",
    command: "",
    event_rcon: "",
    event_broadcast: "",
    warn_minutes: 0,
    warn_message: "",
    max_runs: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedType = TASK_TYPES.find(t => t.value === form.task_type);

  const buildPayload = () => {
    switch (form.task_type) {
      case "broadcast": return JSON.stringify({ message: form.message });
      case "rcon_command": return JSON.stringify({ command: form.command });
      case "event_start":
      case "event_end":
        return JSON.stringify({
          rcon_command: form.event_rcon || undefined,
          broadcast_message: form.event_broadcast || undefined,
        });
      default: return "{}";
    }
  };

  const getCron = () => {
    if (form.cron_preset === "custom") return form.cron_custom;
    return form.cron_preset;
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);

    const data = {
      name: form.name.trim(),
      task_type: form.task_type,
      schedule_type: form.schedule_type,
      payload: buildPayload(),
      status: "active",
      created_by_email: userEmail,
      run_count: 0,
      warn_minutes_before: form.warn_minutes || 0,
      warn_message: form.warn_message || undefined,
    };

    if (form.schedule_type === "once") {
      if (!form.run_at) { setSubmitting(false); return; }
      data.run_at = new Date(form.run_at).toISOString();
    } else {
      data.cron_expression = getCron();
      if (form.max_runs > 0) data.max_runs = form.max_runs;
    }

    await base44.entities.ScheduledTask.create(data);
    toast({ title: "Task Scheduled", description: form.name });
    setForm({
      name: "", task_type: "restart", schedule_type: "once", run_at: "",
      cron_preset: "0 4 * * *", cron_custom: "", message: "", command: "",
      event_rcon: "", event_broadcast: "", warn_minutes: 0, warn_message: "", max_runs: 0,
    });
    setSubmitting(false);
    onCreated?.();
  };

  const canSubmit = form.name.trim() &&
    (form.schedule_type === "once" ? !!form.run_at : !!(form.cron_preset === "custom" ? form.cron_custom : form.cron_preset)) &&
    (form.task_type !== "broadcast" || form.message.trim()) &&
    (form.task_type !== "rcon_command" || form.command.trim());

  return (
    <div className="space-y-3">
      {/* Row 1: Name + Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Task Name *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Daily 4am Restart" className="h-7 text-xs bg-secondary/50 mt-1" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Task Type *</Label>
          <Select value={form.task_type} onValueChange={v => set("task_type", v)}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-[10px]">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedType && <p className="text-[9px] text-muted-foreground mt-0.5">{selectedType.hint}</p>}
        </div>
      </div>

      {/* Row 2: Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Schedule</Label>
          <Select value={form.schedule_type} onValueChange={v => set("schedule_type", v)}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="once" className="text-[10px]">One-Time</SelectItem>
              <SelectItem value="recurring" className="text-[10px]">Recurring (Cron)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.schedule_type === "once" ? (
          <div>
            <Label className="text-[10px] uppercase tracking-wider">Run At (local time) *</Label>
            <Input type="datetime-local" value={form.run_at} onChange={e => set("run_at", e.target.value)} className="h-7 text-xs bg-secondary/50 mt-1" />
          </div>
        ) : (
          <div>
            <Label className="text-[10px] uppercase tracking-wider">Cron Schedule (UTC) *</Label>
            <Select value={form.cron_preset} onValueChange={v => set("cron_preset", v)}>
              <SelectTrigger className="h-7 text-[10px] bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map(p => (
                  <SelectItem key={p.value} value={p.value} className="text-[10px]">{p.label}{p.value !== "custom" && ` — ${p.value}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.cron_preset === "custom" && (
              <Input value={form.cron_custom} onChange={e => set("cron_custom", e.target.value)} placeholder="e.g. 0 */6 * * *" className="h-7 text-xs bg-secondary/50 mt-1" />
            )}
          </div>
        )}
      </div>

      {/* Task-specific fields */}
      {form.task_type === "broadcast" && (
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Broadcast Message *</Label>
          <Textarea value={form.message} onChange={e => set("message", e.target.value)} placeholder="Message sent to all players in-game and in-app" rows={2} className="text-xs bg-secondary/50 mt-1" />
        </div>
      )}

      {form.task_type === "rcon_command" && (
        <div>
          <Label className="text-[10px] uppercase tracking-wider">RCON Command *</Label>
          <Input value={form.command} onChange={e => set("command", e.target.value)} placeholder="e.g. SetTimeOfDay 12:00" className="h-7 text-xs bg-secondary/50 mt-1" />
        </div>
      )}

      {(form.task_type === "event_start" || form.task_type === "event_end") && (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wider">RCON Command</Label>
            <Input value={form.event_rcon} onChange={e => set("event_rcon", e.target.value)} placeholder="Optional RCON command to execute" className="h-7 text-xs bg-secondary/50 mt-1" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider">Broadcast Message</Label>
            <Input value={form.event_broadcast} onChange={e => set("event_broadcast", e.target.value)} placeholder="Optional announcement" className="h-7 text-xs bg-secondary/50 mt-1" />
          </div>
        </div>
      )}

      {/* Warning + Max runs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Warn Before (min)</Label>
          <Input type="number" min={0} max={60} value={form.warn_minutes} onChange={e => set("warn_minutes", parseInt(e.target.value) || 0)} className="h-7 text-xs bg-secondary/50 mt-1" />
          <p className="text-[9px] text-muted-foreground mt-0.5">0 = no warning</p>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Warning Message</Label>
          <Input value={form.warn_message} onChange={e => set("warn_message", e.target.value)} placeholder="Auto-generated if empty" className="h-7 text-xs bg-secondary/50 mt-1" />
        </div>
        {form.schedule_type === "recurring" && (
          <div>
            <Label className="text-[10px] uppercase tracking-wider">Max Runs</Label>
            <Input type="number" min={0} value={form.max_runs} onChange={e => set("max_runs", parseInt(e.target.value) || 0)} className="h-7 text-xs bg-secondary/50 mt-1" />
            <p className="text-[9px] text-muted-foreground mt-0.5">0 = unlimited</p>
          </div>
        )}
      </div>

      <Button onClick={submit} disabled={submitting || !canSubmit} size="sm" className="h-7 text-[10px] uppercase tracking-wider w-full">
        {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
        SCHEDULE TASK
      </Button>
    </div>
  );
}