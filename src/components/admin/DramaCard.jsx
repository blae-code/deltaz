import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle, Users, Clock, Zap, Swords, Hammer, Heart, Crown, Mountain, Layers } from "lucide-react";
import DramaReactionsPanel from "./DramaReactionsPanel";

const SKILL_CHECK_ICONS = {
  combat: Swords,
  crafting: Hammer,
  medical: Heart,
  leadership: Crown,
  survival: Mountain,
  social: Users,
};

const DIFFICULTY_COLORS = {
  easy: "text-status-ok",
  moderate: "text-accent",
  hard: "text-status-warn",
  extreme: "text-destructive",
};
import moment from "moment";

const SEVERITY_STYLES = {
  minor: "border-border bg-secondary/30 text-muted-foreground",
  moderate: "border-accent/30 bg-accent/5 text-accent",
  serious: "border-status-warn/40 bg-status-warn/5 text-status-warn",
  critical: "border-destructive/40 bg-destructive/5 text-destructive",
};

const DRAMA_ICONS = {
  desertion: "🏃",
  fight: "👊",
  mutiny: "⚔️",
  theft: "🔓",
  breakdown: "😰",
  sabotage: "💣",
  romance: "💕",
  rivalry: "🏆",
};

const RISK_COLORS = {
  low: "text-status-ok",
  medium: "text-accent",
  high: "text-destructive",
  none: "text-muted-foreground",
};

export default function DramaCard({ drama, onResolved }) {
  const [resolving, setResolving] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const isActive = drama.status === "active";
  const options = drama.resolution_options || [];

  const handleResolve = async (optionId) => {
    setResolving(true);
    const res = await base44.functions.invoke("resolveSurvivorDrama", {
      drama_id: drama.id,
      resolution_id: optionId,
    });
    if (res.data?.error) {
      toast({ title: "Resolution failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: "Drama resolved", description: res.data.outcome?.slice(0, 100) });
      onResolved?.();
    }
    setResolving(false);
  };

  return (
    <div className={`border rounded-sm overflow-hidden ${SEVERITY_STYLES[drama.severity]}`}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{DRAMA_ICONS[drama.drama_type] || "⚡"}</span>
            <h4 className="text-[11px] font-bold font-mono tracking-wide truncate">{drama.title}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[8px] uppercase">{drama.drama_type}</Badge>
            <Badge variant="outline" className={`text-[8px] uppercase ${SEVERITY_STYLES[drama.severity]}`}>
              {drama.severity}
            </Badge>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">{drama.description}</p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {(drama.involved_survivor_names || []).join(", ") || "Unknown"}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Morale at trigger: {drama.morale_trigger ?? "?"}%
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {moment(drama.created_date).fromNow()}
          </span>
          {drama.complexity_tier && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {drama.complexity_tier}
            </span>
          )}
        </div>

        {/* Context factors */}
        {drama.context_factors?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {drama.context_factors.map((f, i) => (
              <Badge key={i} variant="outline" className="text-[7px] uppercase">{f.replace(/_/g, ' ')}</Badge>
            ))}
          </div>
        )}

        {/* AI Reactions */}
        {(drama.ai_reactions || []).length > 0 && (
          <DramaReactionsPanel reactions={drama.ai_reactions} />
        )}

        {/* Resolution options (active only) */}
        {isActive && options.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">
              Resolution Actions
            </div>
            {options.map((opt) => (
              <button
                key={opt.id}
                disabled={resolving}
                onClick={() => {
                  setSelectedOption(opt.id);
                  handleResolve(opt.id);
                }}
                className={`w-full text-left border rounded-sm px-3 py-2 transition-colors hover:bg-secondary/60 ${
                  selectedOption === opt.id ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-foreground">{opt.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {opt.morale_effect !== 0 && (
                      <span className={`text-[9px] font-mono ${opt.morale_effect > 0 ? "text-status-ok" : "text-destructive"}`}>
                        {opt.morale_effect > 0 ? "+" : ""}{opt.morale_effect} morale
                      </span>
                    )}
                    <span className={`text-[8px] uppercase ${RISK_COLORS[opt.risk]}`}>
                      {opt.risk} risk
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</p>
                {opt.skill_check && opt.skill_check.skill && (() => {
                  const SkIcon = SKILL_CHECK_ICONS[opt.skill_check.skill] || Zap;
                  return (
                    <div className="flex items-center gap-1.5 mt-1 border-t border-border/30 pt-1">
                      <SkIcon className={`h-3 w-3 ${DIFFICULTY_COLORS[opt.skill_check.difficulty] || 'text-primary'}`} />
                      <span className={`text-[8px] font-mono uppercase tracking-wider ${DIFFICULTY_COLORS[opt.skill_check.difficulty] || 'text-primary'}`}>
                        {opt.skill_check.skill} check ({opt.skill_check.difficulty})
                      </span>
                    </div>
                  );
                })()}
              </button>
            ))}
          </div>
        )}

        {/* Resolved outcome */}
        {drama.status === "resolved" && drama.resolution_outcome && (
          <div className="border border-status-ok/20 bg-status-ok/5 rounded-sm px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle className="h-3 w-3 text-status-ok" />
              <span className="text-[9px] text-status-ok uppercase tracking-wider font-semibold">Resolved</span>
              {drama.resolved_by && (
                <span className="text-[9px] text-muted-foreground">by {drama.resolved_by}</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{drama.resolution_outcome}</p>
            {drama.consequences?.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {drama.consequences.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-[8px]">{c}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}