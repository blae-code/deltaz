import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2 } from "lucide-react";

const EVENT_TYPES = [
  "combat_kill", "combat_death", "combat_raid", "base_breach",
  "territory_capture", "territory_lost",
  "mission_completed", "mission_failed",
  "trade_completed", "diplomacy_change",
  "airdrop", "explosion", "vehicle_destroyed", "custom",
];

const SEVERITIES = ["routine", "notable", "critical", "emergency"];

export default function ManualLogForm({ factions, onCreated }) {
  const [form, setForm] = useState({
    event_type: "custom",
    title: "",
    detail: "",
    severity: "routine",
    faction_id: "",
    sector: "",
    player_callsign: "",
    target_callsign: "",
    weapon: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);

    const entry = { ...form, source: "manual" };
    // Attach faction name snapshot
    if (form.faction_id) {
      const faction = (factions || []).find((f) => f.id === form.faction_id);
      if (faction) entry.faction_name = faction.name;
    }
    // Remove empty strings
    Object.keys(entry).forEach((k) => {
      if (entry[k] === "") delete entry[k];
    });

    await base44.functions.invoke("ingestOpsLog", entry);
    toast({ title: "Log Entry Created", description: form.title });
    setForm({ event_type: "custom", title: "", detail: "", severity: "routine", faction_id: "", sector: "", player_callsign: "", target_callsign: "", weapon: "" });
    setSubmitting(false);
    onCreated?.();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Event Type</Label>
          <Select value={form.event_type} onValueChange={(v) => set("event_type", v)}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-[10px]">
                  {t.replace(/_/g, " ").toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Severity</Label>
          <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s} className="text-[10px]">
                  {s.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider">Title *</Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Viper downed Reaper at North Bridge"
          className="h-7 text-xs bg-secondary/50 mt-1"
          maxLength={200}
        />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider">Detail</Label>
        <Textarea
          value={form.detail}
          onChange={(e) => set("detail", e.target.value)}
          placeholder="Full description of the event..."
          className="text-xs bg-secondary/50 mt-1"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Clan</Label>
          <Select value={form.faction_id || "none"} onValueChange={(v) => set("faction_id", v === "none" ? "" : v)}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 mt-1">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-[10px]">None</SelectItem>
              {(factions || []).map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-[10px]">
                  {f.tag} {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Sector</Label>
          <Input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="e.g. B-3" className="h-7 text-xs bg-secondary/50 mt-1" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Player</Label>
          <Input value={form.player_callsign} onChange={(e) => set("player_callsign", e.target.value)} placeholder="Callsign" className="h-7 text-xs bg-secondary/50 mt-1" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Target</Label>
          <Input value={form.target_callsign} onChange={(e) => set("target_callsign", e.target.value)} placeholder="Victim/partner" className="h-7 text-xs bg-secondary/50 mt-1" />
        </div>
      </div>

      <Button onClick={submit} disabled={submitting || !form.title.trim()} size="sm" className="h-7 text-[10px] uppercase tracking-wider w-full">
        {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
        LOG EVENT
      </Button>
    </div>
  );
}