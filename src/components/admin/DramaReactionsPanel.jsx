import { Badge } from "@/components/ui/badge";
import { MessageCircle, Shield, Megaphone, HandHeart, Eye, Skull, Search, Smile } from "lucide-react";
import moment from "moment";

const REACTION_META = {
  de_escalate:  { icon: Shield,       color: "text-status-ok",     label: "De-escalation" },
  spread_rumor: { icon: Megaphone,    color: "text-status-warn",   label: "Rumor" },
  form_alliance:{ icon: MessageCircle, color: "text-accent",       label: "Alliance" },
  offer_help:   { icon: HandHeart,    color: "text-primary",       label: "Helping" },
  avoid:        { icon: Eye,          color: "text-muted-foreground", label: "Avoidance" },
  exploit:      { icon: Skull,        color: "text-destructive",   label: "Exploitation" },
  investigate:  { icon: Search,       color: "text-chart-4",       label: "Investigation" },
  morale_boost: { icon: Smile,        color: "text-status-ok",     label: "Morale Boost" },
};

const EFFECT_STYLES = {
  positive: "bg-status-ok/10 text-status-ok border-status-ok/20",
  negative: "bg-destructive/10 text-destructive border-destructive/20",
  neutral: "bg-secondary text-muted-foreground border-border",
};

export default function DramaReactionsPanel({ reactions }) {
  if (!reactions || reactions.length === 0) return null;

  const posCount = reactions.filter(r => r.effect === 'positive').length;
  const negCount = reactions.filter(r => r.effect === 'negative').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">
          Survivor Reactions ({reactions.length})
        </span>
        <div className="flex items-center gap-2">
          {posCount > 0 && (
            <span className="text-[8px] text-status-ok font-mono">{posCount} helpful</span>
          )}
          {negCount > 0 && (
            <span className="text-[8px] text-destructive font-mono">{negCount} escalating</span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {reactions.map((r, i) => {
          const meta = REACTION_META[r.reaction_type] || REACTION_META.avoid;
          const Icon = meta.icon;
          return (
            <div key={i} className={`border rounded-sm px-2.5 py-2 ${EFFECT_STYLES[r.effect] || EFFECT_STYLES.neutral}`}>
              <div className="flex items-center gap-2">
                <Icon className={`h-3 w-3 shrink-0 ${meta.color}`} />
                <span className="text-[10px] font-semibold text-foreground">{r.survivor_name}</span>
                <Badge variant="outline" className={`text-[7px] uppercase ${meta.color}`}>
                  {meta.label}
                </Badge>
                {r.timestamp && (
                  <span className="text-[8px] text-muted-foreground ml-auto shrink-0">
                    {moment(r.timestamp).fromNow()}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed">{r.narrative}</p>
              {r.action && (
                <p className="text-[9px] font-mono mt-0.5 italic opacity-80">→ {r.action}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}