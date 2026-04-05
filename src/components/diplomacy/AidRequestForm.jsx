import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Send, Loader2 } from "lucide-react";

const AID_TYPES = [
  { value: "military", label: "Military Support", desc: "Combat reinforcements & weapons" },
  { value: "supplies", label: "Supplies", desc: "Food, water, and general provisions" },
  { value: "medical", label: "Medical Aid", desc: "Medicine, medics, and treatment" },
  { value: "intelligence", label: "Intelligence", desc: "Recon data, informants, and analysis" },
  { value: "engineering", label: "Engineering", desc: "Repairs, fortifications, and tech" },
];

const URGENCIES = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "medium", label: "Medium", color: "text-accent" },
  { value: "high", label: "High", color: "text-orange-400" },
  { value: "critical", label: "Critical", color: "text-status-danger" },
];

export default function AidRequestForm({ factions, userFactionIds, userEmail, onRequested }) {
  const [fromFaction, setFromFaction] = useState("");
  const [toFaction, setToFaction] = useState("");
  const [aidType, setAidType] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const myFactions = factions.filter(f => userFactionIds.includes(f.id));
  const targetFactions = factions.filter(f => f.id !== fromFaction && f.status === "active");

  const submit = async () => {
    if (!fromFaction || !toFaction || !aidType || !message.trim()) return;
    setSubmitting(true);
    await base44.entities.AidRequest.create({
      requester_email: userEmail,
      requester_faction_id: fromFaction,
      target_faction_id: toFaction,
      aid_type: aidType,
      urgency,
      message: message.trim(),
      status: "pending",
    });
    toast({ title: "Aid Request Sent", description: "The target faction leadership has been notified." });
    setMessage("");
    setAidType("");
    setToFaction("");
    onRequested?.();
    setSubmitting(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">YOUR FACTION</Label>
          <Select value={fromFaction} onValueChange={setFromFaction}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {myFactions.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                    {f.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">REQUEST AID FROM</Label>
          <Select value={toFaction} onValueChange={setToFaction}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {targetFactions.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                    {f.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">AID TYPE</Label>
          <Select value={aidType} onValueChange={setAidType}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {AID_TYPES.map(a => (
                <SelectItem key={a.value} value={a.value}>{a.label} — {a.desc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">URGENCY</Label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {URGENCIES.map(u => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">MESSAGE</Label>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe what you need and why..."
          className="text-xs bg-secondary/50 mt-0.5"
          rows={3}
        />
      </div>

      <Button
        onClick={submit}
        disabled={!fromFaction || !toFaction || !aidType || !message.trim() || submitting}
        className="w-full font-mono text-[10px] uppercase tracking-wider h-7"
      >
        {submitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
        {submitting ? "TRANSMITTING..." : "SEND AID REQUEST"}
      </Button>
    </div>
  );
}