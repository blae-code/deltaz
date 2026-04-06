import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Shield, Plus, Megaphone, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AdminSubSection from "./AdminSubSection";
import SchemaWarningBanner from "./SchemaWarningBanner";
import InlineConfirm from "../terminal/InlineConfirm";
import TerritoryOpsPanel from "./TerritoryOpsPanel";
import DiplomacyPanel from "./DiplomacyPanel";

// --- CreateFactionForm ---
// TODO: Schema drift — Faction entity expects "tag" but this form sends "code".
// The form now sends "tag" to match the schema. "code" field renamed to "tag" in UI.
function CreateFactionForm({ onCreated }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.Faction.create({ name, tag, description, color, status: "active" });
    toast({ title: "Clan registered", description: `${name} [${tag}] is now active.` });
    setName(""); setTag(""); setDescription("");
    setSubmitting(false);
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono">CLAN NAME</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required className="h-8 font-mono text-xs bg-muted" placeholder="e.g. Iron Order" />
        </div>
        <div>
          <Label className="text-[10px] font-mono">TAG (max 5 chars)</Label>
          <Input value={tag} onChange={e => setTag(e.target.value)} required maxLength={5} className="h-8 font-mono text-xs bg-muted" placeholder="e.g. [IRO]" />
        </div>
      </div>
      <div>
        <Label className="text-[10px] font-mono">DESCRIPTION</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="font-mono text-xs bg-muted" rows={2} placeholder="Faction lore and goals..." />
      </div>
      <div>
        <Label className="text-[10px] font-mono">BANNER COLOR</Label>
        <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-20" />
      </div>
      <Button type="submit" size="sm" className="font-mono text-xs" disabled={submitting || !name || !tag}>
        <Plus className="w-3 h-3 mr-1" />{submitting ? "REGISTERING..." : "REGISTER CLAN"}
      </Button>
    </form>
  );
}

// --- CreateTerritoryForm ---
// TODO: Schema drift identified and fixed:
// - threat_level: was green/yellow/orange/red/black → now minimal/low/moderate/high/critical (matches entity)
// - status: was stable/contested/lost/quarantined → now secured/contested/hostile/uncharted (matches entity)
// - "notes" field does NOT exist on Territory entity schema → removed
function CreateTerritoryForm({ onCreated }) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [threatLevel, setThreatLevel] = useState("moderate");
  const [status, setStatus] = useState("uncharted");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.Territory.create({ name, sector, threat_level: threatLevel, status });
    toast({ title: "Territory added", description: `${name} registered at sector ${sector}.` });
    setName(""); setSector("");
    setSubmitting(false);
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono">ZONE NAME</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required className="h-8 font-mono text-xs bg-muted" placeholder="e.g. Ash Flats" />
        </div>
        <div>
          <Label className="text-[10px] font-mono">SECTOR CODE</Label>
          <Input value={sector} onChange={e => setSector(e.target.value)} required className="h-8 font-mono text-xs bg-muted" placeholder="e.g. B-3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono">THREAT LEVEL</Label>
          <Select value={threatLevel} onValueChange={setThreatLevel}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["minimal", "low", "moderate", "high", "critical"].map(l => (
                <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-mono">STATUS</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["secured", "contested", "hostile", "uncharted"].map(s => (
                <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" size="sm" className="font-mono text-xs" disabled={submitting || !name || !sector}>
        <Plus className="w-3 h-3 mr-1" />{submitting ? "ADDING..." : "ADD TERRITORY"}
      </Button>
    </form>
  );
}

// --- CreateEventForm ---
// TODO: Schema drift — identified and annotated:
// - Entity is "Event", not "GameEvent" → FIXED
// - Entity expects "type" not "event_type" → FIXED
// - Entity expects "content" not "description" → FIXED
// - Severity enum: entity uses info/warning/critical/emergency → FIXED
// - Event type enum: entity uses world_event/faction_conflict/anomaly/broadcast/system_alert → FIXED
function CreateEventForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("broadcast");
  const [severity, setSeverity] = useState("info");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.Event.create({
      title,
      type: eventType,
      severity,
      content,
      is_active: true,
    });
    toast({ title: "Event broadcast sent", description: `"${title}" is now live.` });
    setTitle(""); setContent("");
    setSubmitting(false);
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-[10px] font-mono">HEADLINE</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} required className="h-8 font-mono text-xs bg-muted" placeholder="e.g. Radiation Storm Incoming" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono">EVENT TYPE</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["world_event", "faction_conflict", "anomaly", "broadcast", "system_alert"].map(t => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-mono">SEVERITY</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["info", "warning", "critical", "emergency"].map(s => (
                <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-[10px] font-mono">CONTENT</Label>
        <Textarea value={content} onChange={e => setContent(e.target.value)} className="font-mono text-xs bg-muted" rows={2} placeholder="Full event narrative..." />
      </div>
      <InlineConfirm
        variant="default"
        size="sm"
        className="font-mono text-xs"
        confirmLabel="BROADCAST NOW"
        warning="This will create a live event visible to all players immediately. Ensure the content is ready."
        severity="warning"
        onConfirm={handleSubmit}
        disabled={submitting || !title}
      >
        <Megaphone className="w-3 h-3 mr-1" />{submitting ? "BROADCASTING..." : "BROADCAST EVENT"}
      </InlineConfirm>
    </form>
  );
}

// --- Main World Mgmt ---
const TABS = [
  { key: "territory_ops", label: "Territory Ops", icon: Flag },
  { key: "territories", label: "Add Territory", icon: MapPin },
  { key: "factions", label: "Register Clan", icon: Shield },
  { key: "diplomacy", label: "Diplomacy", icon: Shield },
  { key: "events", label: "Broadcast Event", icon: Megaphone, risk: "medium" },
];

export default function AdminWorldMgmt() {
  const [tab, setTab] = useState("territory_ops");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <AdminSubSection
      title="World Management"
      description="Manage the map, factions, diplomatic relations, and global events. Territory and clan changes persist immediately."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "territory_ops" && <TerritoryOpsPanel />}
      {tab === "territories" && <CreateTerritoryForm key={refreshKey} onCreated={refresh} />}
      {tab === "factions" && <CreateFactionForm key={refreshKey} onCreated={refresh} />}
      {tab === "diplomacy" && <DiplomacyPanel />}
      {tab === "events" && <CreateEventForm key={refreshKey} onCreated={refresh} />}
    </AdminSubSection>
  );
}