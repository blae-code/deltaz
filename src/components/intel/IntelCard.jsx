import { Badge } from "@/components/ui/badge";
import { Shield, Zap, FileText } from "lucide-react";
import IntelEyeSvg from "../svg/IntelEyeSvg";
import RadioTowerSvg from "../svg/RadioTowerSvg";
import CrosshairTargetSvg from "../svg/CrosshairTargetSvg";
import AlertSirenSvg from "../svg/AlertSirenSvg";
import moment from "moment";

// SVG-based icons for primary categories, Lucide fallback for others
const svgIcons = {
  rumor: ({ className }) => <RadioTowerSvg size={16} className={className} />,
  mission_brief: ({ className }) => <CrosshairTargetSvg size={16} className={className} />,
  world_event: ({ className }) => <AlertSirenSvg size={16} className={className} />,
};

const categoryConfig = {
  rumor: { icon: null, svgKey: "rumor", color: "text-muted-foreground", bg: "bg-secondary/50 border-border" },
  mission_brief: { icon: null, svgKey: "mission_brief", color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  clan_intel: { icon: Shield, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  faction_intel: { icon: Shield, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  world_event: { icon: null, svgKey: "world_event", color: "text-foreground", bg: "bg-secondary/50 border-border" },
  anomaly_report: { icon: Zap, color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  tactical_advisory: { icon: FileText, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
};

export default function IntelCard({ item, factionName, territoryName, compact = false }) {
  const config = categoryConfig[item.category] || categoryConfig.rumor;
  const Icon = config.icon;
  const SvgRenderer = config.svgKey ? svgIcons[config.svgKey] : null;
  const isExpired = item.expires_at && new Date(item.expires_at) < new Date();

  if (compact) {
    return (
      <div className={`flex items-start gap-2.5 py-2 ${isExpired ? "opacity-40" : ""}`}>
        {SvgRenderer ? <span className={`mt-0.5 shrink-0 ${config.color}`}><SvgRenderer className={config.color} /></span> : <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.source}</span>
            <span className="text-[9px] text-muted-foreground">{moment(item.created_date).fromNow()}</span>
          </div>
        </div>
        <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-semibold uppercase ${severityBadge[item.severity] || severityBadge.medium}`}>
          {item.severity}
        </span>
      </div>
    );
  }

  return (
    <div className={`border rounded-sm p-4 transition-colors ${config.bg} ${isExpired ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${config.color}`}>
          {SvgRenderer ? <SvgRenderer className={config.color} /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-semibold uppercase ${severityBadge[item.severity] || severityBadge.medium}`}>
              {item.severity}
            </span>
            <Badge variant="outline" className="text-[9px] uppercase">
              {item.category?.replace("_", " ")}
            </Badge>
            {isExpired && <Badge variant="secondary" className="text-[9px]">EXPIRED</Badge>}
          </div>
          {item.content && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.content}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[9px] text-muted-foreground tracking-wider">
              SRC: {item.source || "UNKNOWN"}
            </span>
            {factionName && (
              <span className="text-[9px] text-primary tracking-wider">
                ▸ {factionName}
              </span>
            )}
            {territoryName && (
              <span className="text-[9px] text-accent tracking-wider">
                ▸ {territoryName}
              </span>
            )}
            <span className="text-[9px] text-muted-foreground">
              {moment(item.created_date).fromNow()}
            </span>
            {item.expires_at && !isExpired && (
              <span className="text-[9px] text-status-warn/70">
                EXPIRES {moment(item.expires_at).fromNow()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}