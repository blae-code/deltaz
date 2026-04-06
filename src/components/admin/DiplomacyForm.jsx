import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "./ConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Handshake, Swords, ArrowRight, Shield } from "lucide-react";

const STATUSES = [
  { value: "neutral", label: "Neutral", icon: "—", desc: "No formal relationship" },
  { value: "allied", label: "Alliance", icon: "🤝", desc: "Full military & economic cooperation" },
  { value: "trade_agreement", label: "Trade Agreement", icon: "📦", desc: "Economic partnership, shared trade routes" },
  { value: "ceasefire", label: "Ceasefire", icon: "🏳", desc: "Temporary halt to hostilities" },
  { value: "hostile", label: "Hostile", icon: "⚠", desc: "Aggressive posture, raids likely" },
  { value: "war", label: "War", icon: "⚔", desc: "Open conflict, elimination missions" },
];

export default function DiplomacyForm({ factions, getRelation, onSubmit }) {
  const [factionA, setFactionA] = useState("");
  const [factionB, setFactionB] = useState("");
  const [status, setStatus] = useState("");
  const [terms, setTerms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const existing = factionA && factionB ? getRelation(factionA, factionB) : null;
  const fA = factions.find((f) => f.id === factionA);
  const fB = factions.find((f) => f.id === factionB);

  const isHighStakes = status === "war" || status === "hostile";

  const executeSubmit = async () => {
    setSubmitting(true);
    await onSubmit({ factionAId: factionA, factionBId: factionB, status, terms });
    setTerms("");
    setStatus("");
    setSubmitting(false);
  };

  const handleSubmit = () => {
    if (!factionA || !factionB || !status) return;
    if (isHighStakes) {
      setConfirmOpen(true);
    } else {
      executeSubmit();
    }
  };

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          SET DIPLOMATIC STATUS
        </span>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-mono tracking-wider">FACTION A</Label>
            <Select value={factionA} onValueChange={setFactionA}>
              <SelectTrigger className="h-8 text-xs bg-muted mt-1">
                <SelectValue placeholder="Select clan..." />
              </SelectTrigger>
              <SelectContent>
                {factions.map((f) => (
                  <SelectItem key={f.id} value={f.id} disabled={f.id === factionB}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                      {f.name} [{f.tag}]
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-mono tracking-wider">FACTION B</Label>
            <Select value={factionB} onValueChange={setFactionB}>
              <SelectTrigger className="h-8 text-xs bg-muted mt-1">
                <SelectValue placeholder="Select clan..." />
              </SelectTrigger>
              <SelectContent>
                {factions.map((f) => (
                  <SelectItem key={f.id} value={f.id} disabled={f.id === factionA}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                      {f.name} [{f.tag}]
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current status display */}
        {factionA && factionB && factionA !== factionB && (
          <div className="flex items-center gap-3 border border-border rounded-sm px-3 py-2 bg-muted/30">
            <span className="text-[10px] text-muted-foreground tracking-wider">CURRENT:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: fA?.color }}>{fA?.tag}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold" style={{ color: fB?.color }}>{fB?.tag}</span>
            </div>
            <Badge variant="outline" className="text-[9px] uppercase">
              {existing?.status || "neutral"}
            </Badge>
          </div>
        )}

        {/* Status selection */}
        <div>
          <Label className="text-[10px] font-mono tracking-wider">NEW STATUS</Label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                className={`border rounded-sm px-2 py-1.5 text-left transition-colors ${
                  status === s.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                }`}
                onClick={() => setStatus(s.value)}
              >
                <div className="text-[10px] font-semibold">{s.icon} {s.label}</div>
                <div className="text-[8px] opacity-60 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div>
          <Label className="text-[10px] font-mono tracking-wider">TERMS / NOTES (OPTIONAL)</Label>
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="E.g. Trade food for munitions, 10 units/cycle..."
            className="text-xs bg-muted mt-1"
            rows={2}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!factionA || !factionB || !status || factionA === factionB || submitting}
          className={`w-full font-mono text-xs uppercase tracking-wider ${
            isHighStakes ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
          }`}
        >
          {isHighStakes ? (
            <Swords className="h-3.5 w-3.5 mr-2" />
          ) : (
            <Handshake className="h-3.5 w-3.5 mr-2" />
          )}
          {submitting ? "TRANSMITTING..." : "SET DIPLOMATIC STATUS"}
        </Button>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={status === "war" ? "DECLARE WAR" : "SET HOSTILE STATUS"}
          description={`You are about to ${status === "war" ? "declare war between" : "set hostile relations between"} ${fA?.name || "Faction A"} and ${fB?.name || "Faction B"}. This will be broadcast to all operatives immediately.`}
          impact={status === "war" ? "Triggers elimination missions, blocks trade routes, and escalates all faction interactions. This cannot be quietly undone." : "Raids become likely, trade may be disrupted, and faction tensions will escalate server-wide."}
          severity="danger"
          confirmLabel={status === "war" ? "DECLARE WAR" : "CONFIRM HOSTILE"}
          onConfirm={executeSubmit}
        />
      </div>
    </div>
  );
}