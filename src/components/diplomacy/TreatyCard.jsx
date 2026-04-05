import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Check, X, MessageSquare, Loader2, Shield, Clock, Undo2, Zap } from "lucide-react";
import moment from "moment";

const typeIcons = { non_aggression: "🛡", trade_pact: "📦", alliance: "⚔" };
const typeLabels = { non_aggression: "Non-Aggression", trade_pact: "Trade Pact", alliance: "Alliance" };

const statusStyles = {
  proposed: "bg-accent/10 text-accent border-accent/20",
  negotiating: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  accepted: "bg-status-ok/10 text-status-ok border-status-ok/20",
  rejected: "bg-status-danger/10 text-status-danger border-status-danger/20",
  expired: "bg-muted text-muted-foreground",
  revoked: "bg-status-warn/10 text-status-warn border-status-warn/20",
};

export default function TreatyCard({ treaty, factions, userEmail, userFactionIds, onUpdate }) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterTerms, setCounterTerms] = useState(treaty.counter_terms || "");
  const [acting, setActing] = useState(null);
  const { toast } = useToast();

  const fA = factions.find(f => f.id === treaty.proposer_faction_id);
  const fB = factions.find(f => f.id === treaty.target_faction_id);
  const isTargetLead = userFactionIds.includes(treaty.target_faction_id);
  const isProposerLead = userFactionIds.includes(treaty.proposer_faction_id);
  const canRespond = isTargetLead && ['proposed', 'negotiating'].includes(treaty.status);
  const canRevoke = (isProposerLead || isTargetLead) && treaty.status === 'accepted';

  const doAction = async (action, extra = {}) => {
    setActing(action);
    try {
      await base44.functions.invoke("treatyEngine", { action, treaty_id: treaty.id, ...extra });
      toast({ title: `Treaty ${action}${action === "accept" ? "ed" : action === "reject" ? "ed" : action === "counter" ? " sent" : "d"}` });
      onUpdate?.();
    } catch (err) {
      toast({ title: "Action failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setActing(null);
      setShowCounter(false);
    }
  };

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeIcons[treaty.treaty_type]}</span>
          <div>
            <span className="text-xs font-bold font-display tracking-wider text-foreground">
              {typeLabels[treaty.treaty_type]}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold" style={{ color: fA?.color }}>{fA?.name}</span>
              <span className="text-[9px] text-muted-foreground">↔</span>
              <span className="text-[10px] font-semibold" style={{ color: fB?.color }}>{fB?.name}</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={`text-[9px] uppercase ${statusStyles[treaty.status] || ""}`}>
          {treaty.status}
        </Badge>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {treaty.terms && (
          <div>
            <p className="text-[9px] text-muted-foreground tracking-wider uppercase mb-0.5">TERMS</p>
            <p className="text-xs text-foreground">{treaty.terms}</p>
          </div>
        )}
        {treaty.counter_terms && (
          <div>
            <p className="text-[9px] text-muted-foreground tracking-wider uppercase mb-0.5">COUNTER-PROPOSAL</p>
            <p className="text-xs text-chart-4">{treaty.counter_terms}</p>
          </div>
        )}

        {/* Effects */}
        {treaty.status === "accepted" && treaty.commodity_effects?.length > 0 && (
          <div>
            <p className="text-[9px] text-muted-foreground tracking-wider uppercase mb-0.5 flex items-center gap-1">
              <Zap className="h-3 w-3" /> MARKET EFFECTS
            </p>
            <div className="flex flex-wrap gap-1.5">
              {treaty.commodity_effects.map((e, i) => (
                <Badge key={i} variant="outline" className="text-[9px]">
                  {e.resource}: {e.modifier > 0 ? "+" : ""}{Math.round(e.modifier * 100)}%
                </Badge>
              ))}
            </div>
          </div>
        )}
        {treaty.status === "accepted" && treaty.territory_effects?.length > 0 && (
          <div>
            <p className="text-[9px] text-muted-foreground tracking-wider uppercase mb-0.5 flex items-center gap-1">
              <Shield className="h-3 w-3" /> TERRITORY EFFECTS
            </p>
            <p className="text-[10px] text-status-ok">
              {treaty.territory_effects.length} zone(s) security upgraded
            </p>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {treaty.duration_days}d</span>
          {treaty.signed_at && <span>Signed {moment(treaty.signed_at).fromNow()}</span>}
          {treaty.expires_at && treaty.status === "accepted" && (
            <span>Expires {moment(treaty.expires_at).fromNow()}</span>
          )}
          <span>{moment(treaty.created_date).fromNow()}</span>
        </div>

        {/* Counter-proposal form */}
        {showCounter && (
          <div className="space-y-2 pt-1">
            <Textarea
              value={counterTerms}
              onChange={e => setCounterTerms(e.target.value)}
              placeholder="Submit counter-terms..."
              className="text-xs bg-muted"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" className="text-[10px] h-7 flex-1" onClick={() => doAction("counter", { counter_terms: counterTerms })} disabled={acting === "counter"}>
                {acting === "counter" ? <Loader2 className="h-3 w-3 animate-spin" /> : "SEND COUNTER"}
              </Button>
              <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => setShowCounter(false)}>CANCEL</Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {canRespond && !showCounter && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="text-[10px] h-7 flex-1" onClick={() => doAction("accept")} disabled={!!acting}>
              {acting === "accept" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              SIGN TREATY
            </Button>
            <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => setShowCounter(true)} disabled={!!acting}>
              <MessageSquare className="h-3 w-3 mr-1" /> COUNTER
            </Button>
            <Button variant="destructive" size="sm" className="text-[10px] h-7" onClick={() => doAction("reject")} disabled={!!acting}>
              {acting === "reject" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
              REJECT
            </Button>
          </div>
        )}

        {canRevoke && (
          <Button variant="outline" size="sm" className="text-[10px] h-7 w-full text-status-warn border-status-warn/30" onClick={() => doAction("revoke")} disabled={!!acting}>
            {acting === "revoke" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Undo2 className="h-3 w-3 mr-1" />}
            REVOKE TREATY
          </Button>
        )}
      </div>
    </div>
  );
}