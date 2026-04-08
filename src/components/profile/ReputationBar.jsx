import { Shield, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const RANKS = [
  { name: "enemy",   threshold: -500, color: "bg-status-danger",    tip: "Actively hunted. Faction will attack on sight." },
  { name: "hostile", threshold: -200, color: "bg-status-danger/70", tip: "Hostile relations. Barred from faction services." },
  { name: "unknown", threshold: 0,    color: "bg-muted-foreground", tip: "No established record with this faction." },
  { name: "neutral", threshold: 100,  color: "bg-foreground/50",    tip: "Acknowledged operative. Basic services available." },
  { name: "trusted", threshold: 300,  color: "bg-primary/70",       tip: "Trusted status. Mission access and 10% fee reduction." },
  { name: "allied",  threshold: 600,  color: "bg-primary",          tip: "Full alliance. Priority contracts and 25% fee reduction." },
  { name: "revered", threshold: 1000, color: "bg-accent",           tip: "Legendary standing. Exclusive missions and max discounts." },
];

const rankBadgeColor = {
  enemy:   "border-status-danger/50 text-status-danger",
  hostile: "border-status-danger/40 text-status-danger/70",
  unknown: "border-border text-muted-foreground",
  neutral: "border-border text-muted-foreground",
  trusted: "border-primary/40 text-primary",
  allied:  "border-primary/60 text-primary",
  revered: "border-accent/60 text-accent",
};

function getRankProgress(score) {
  let currentRankIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) { currentRankIdx = i; break; }
  }
  const current = RANKS[currentRankIdx];
  const next = RANKS[currentRankIdx + 1];
  if (!next) return { current, next: null, progress: 100, pointsToNext: 0 };
  const rangeSize = next.threshold - current.threshold;
  const pointsIn = score - current.threshold;
  const progress = Math.min(100, Math.max(0, (pointsIn / rangeSize) * 100));
  return { current, next, progress, pointsToNext: next.threshold - score };
}

export default function ReputationBar({ reputation, factionName, factionColor }) {
  const { current, next, progress, pointsToNext } = getRankProgress(reputation.score);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="panel-frame p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 shrink-0" style={{ color: factionColor || "hsl(var(--primary))" }} />
            <span className="text-xs font-semibold text-foreground">{factionName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] text-primary cursor-help">
                  <Award className="h-3 w-3" />
                  <span>{reputation.score} PTS</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-[11px] bg-card border-primary/30">
                <p className="text-muted-foreground">Reputation score with {factionName}.</p>
                <p className="text-muted-foreground/60 mt-0.5 text-[10px]">Earned through completed missions and diplomacy.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase cursor-help ${rankBadgeColor[current.name] || ""}`}
                >
                  {current.name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-[11px] bg-card border-primary/30 max-w-[240px]">
                <p className={`font-semibold text-[10px] mb-0.5 ${rankBadgeColor[current.name]?.split(" ").pop() || "text-primary"}`}>
                  {current.name.toUpperCase()}
                </p>
                <p className="text-muted-foreground">{current.tip}</p>
                {next && (
                  <p className="text-muted-foreground/60 mt-1 text-[10px]">
                    Next: <span className="text-foreground uppercase">{next.name}</span> at {next.threshold} pts ({pointsToNext} to go)
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-secondary overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${current.color}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="uppercase tracking-wider">{current.name}</span>
            {next ? (
              <span>
                <span className="text-primary">{pointsToNext}</span> pts to{" "}
                <span className="uppercase text-foreground">{next.name}</span>
              </span>
            ) : (
              <span className="text-accent tracking-wider">MAX RANK</span>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
