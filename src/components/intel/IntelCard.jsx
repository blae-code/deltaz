import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Zap, FileText } from "lucide-react";
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

const severityBadge = {
  low:      "border border-border text-muted-foreground bg-transparent",
  medium:   "border border-accent/40 text-accent bg-transparent",
  high:     "border border-status-danger/40 text-status-danger bg-transparent",
  critical: "border border-status-danger/60 text-status-danger font-bold bg-status-danger/10",
};

const severityTip = {
  low:      "Low priority — background noise. No immediate action required.",
  medium:   "Medium priority — notable development. Monitor situation.",
  high:     "High priority — significant threat or opportunity. Act within cycle.",
  critical: "CRITICAL — immediate action required. Failure to respond may have severe consequences.",
};

const categoryTooltip = {
  rumor:             "Unverified field report. Treat with caution — source reliability unknown.",
  mission_brief:     "Classified mission intelligence. Contains operational parameters and objectives.",
  clan_intel:        "Internal clan data. Disposition, leadership, and resource state of an allied or rival clan.",
  faction_intel:     "Faction-level intelligence. Covers standing forces, territory posture, and diplomatic signals.",
  world_event:       "Sector-wide event. May affect multiple territories, factions, or operative deployments.",
  anomaly_report:    "Detected anomaly — unusual readings or unexplained activity in the field.",
  tactical_advisory: "Command advisory. Recommended posture or action for current operational theater.",
};

export default function IntelCard({ item, factionName, territoryName, compact = false }) {
  const config = categoryConfig[item.category] || categoryConfig.rumor;
  const Icon = config.icon;
  const SvgRenderer = config.svgKey ? svgIcons[config.svgKey] : null;
  const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
  const sevClass = severityBadge[item.severity] || severityBadge.medium;
  const sevTip = severityTip[item.severity] || severityTip.medium;

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
      <div className={`flex items-start gap-2.5 py-2 ${isExpired ? "opacity-40" : ""}`}>
        {SvgRenderer ? <span className={`mt-0.5 shrink-0 ${config.color}`}><SvgRenderer className={config.color} /></span> : <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.source}</span>
            <span className="text-[9px] text-muted-foreground">{moment(item.created_date).fromNow()}</span>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-[8px] px-1.5 py-0.5 font-semibold uppercase cursor-help ${sevClass}`}>
              {item.severity}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-mono text-[11px] bg-card border-primary/30 max-w-[220px]">
            <p className="font-semibold text-[10px] mb-0.5 uppercase">{item.severity}</p>
            <p className="text-muted-foreground">{sevTip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className={`panel-frame p-4 transition-colors ${config.bg} ${isExpired ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${config.color}`}>
          {SvgRenderer ? <SvgRenderer className={config.color} /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-[9px] px-1.5 py-0.5 font-semibold uppercase cursor-help ${sevClass}`}>
                  {item.severity}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-[11px] bg-card border-primary/30 max-w-[220px]">
                <p className="font-semibold text-[10px] mb-0.5 uppercase">{item.severity}</p>
                <p className="text-muted-foreground">{sevTip}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[9px] uppercase cursor-help">
                  {item.category?.replace("_", " ")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-[11px] bg-card border-primary/30 max-w-[240px]">
                <p className="font-semibold text-[10px] mb-0.5 uppercase">{item.category?.replace("_", " ")}</p>
                <p className="text-muted-foreground">{categoryTooltip[item.category] || "Field intelligence report."}</p>
              </TooltipContent>
            </Tooltip>
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
    </TooltipProvider>
  );
}
