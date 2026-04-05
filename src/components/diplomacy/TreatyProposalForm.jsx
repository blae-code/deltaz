import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { FileSignature, Loader2 } from "lucide-react";

const TREATY_TYPES = [
  { value: "non_aggression", label: "Non-Aggression Pact", icon: "🛡", desc: "Mutual non-hostility, border security improved" },
  { value: "trade_pact", label: "Trade Pact", icon: "📦", desc: "Commodity price reductions, shared trade benefits" },
  { value: "alliance", label: "Alliance", icon: "⚔", desc: "Full cooperation — maximum market & security bonuses" },
];

export default function TreatyProposalForm({ factions, userFactionIds, onProposed }) {
  const [proposerFaction, setProposerFaction] = useState("");
  const [targetFaction, setTargetFaction] = useState("");
  const [treatyType, setTreatyType] = useState("");
  const [terms, setTerms] = useState("");
  const [duration, setDuration] = useState("7");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const myFactions = factions.filter(f => userFactionIds.includes(f.id));
  const otherFactions = factions.filter(f => f.id !== proposerFaction && f.status === "active");

  const handleSubmit = async () => {
    if (!proposerFaction || !targetFaction || !treatyType) return;
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("treatyEngine", {
        action: "propose",
        treaty_type: treatyType,
        proposer_faction_id: proposerFaction,
        target_faction_id: targetFaction,
        terms,
        duration_days: parseInt(duration) || 7,
      });
      toast({ title: "Treaty proposed", description: "The target faction has been notified." });
      setTerms("");
      setTreatyType("");
      setTargetFaction("");
      onProposed?.();
    } catch (err) {
      toast({ title: "Proposal failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono tracking-wider">YOUR FACTION</Label>
          <Select value={proposerFaction} onValueChange={setProposerFaction}>
            <SelectTrigger className="h-8 text-xs bg-muted mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {myFactions.map(f => (
                <SelectItem key={f.id} value={f.id}>
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
          <Label className="text-[10px] font-mono tracking-wider">TARGET FACTION</Label>
          <Select value={targetFaction} onValueChange={setTargetFaction}>
            <SelectTrigger className="h-8 text-xs bg-muted mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {otherFactions.map(f => (
                <SelectItem key={f.id} value={f.id}>
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

      <div>
        <Label className="text-[10px] font-mono tracking-wider">TREATY TYPE</Label>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {TREATY_TYPES.map(t => (
            <button
              key={t.value}
              className={`border rounded-sm px-2 py-2 text-left transition-colors ${
                treatyType === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
              }`}
              onClick={() => setTreatyType(t.value)}
            >
              <div className="text-[10px] font-semibold">{t.icon} {t.label}</div>
              <div className="text-[8px] opacity-60 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label className="text-[10px] font-mono tracking-wider">TERMS</Label>
          <Textarea
            value={terms}
            onChange={e => setTerms(e.target.value)}
            placeholder="Outline treaty terms, resource exchanges, conditions..."
            className="text-xs bg-muted mt-1"
            rows={2}
          />
        </div>
        <div>
          <Label className="text-[10px] font-mono tracking-wider">DURATION (DAYS)</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="h-8 text-xs bg-muted mt-1"
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!proposerFaction || !targetFaction || !treatyType || submitting}
        className="w-full font-mono text-xs uppercase tracking-wider"
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <FileSignature className="h-3.5 w-3.5 mr-2" />}
        {submitting ? "TRANSMITTING..." : "PROPOSE TREATY"}
      </Button>
    </div>
  );
}