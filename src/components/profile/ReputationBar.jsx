import { Shield, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RANKS = [
  { name: "enemy", threshold: -500 },
  { name: "hostile", threshold: -200 },
  { name: "unknown", threshold: 0 },
  { name: "neutral", threshold: 100 },
  { name: "trusted", threshold: 300 },
  { name: "allied", threshold: 600 },
  { name: "revered", threshold: 1000 },
];

const rankColor = {
  enemy: "bg-status-danger",
  hostile: "bg-status-danger/70",
  unknown: "bg-muted-foreground",
  neutral: "bg-foreground/50",
  trusted: "bg-primary/70",
  allied: "bg-primary",
  revered: "bg-accent",
};

function getRankProgress(score) {
  let currentRankIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) {
      currentRankIdx = i;
      break;
    }
  }

  const current = RANKS[currentRankIdx];
  const next = RANKS[currentRankIdx + 1];

  if (!next) {
    return { currentRank: current.name, nextRank: null, progress: 100, pointsToNext: 0 };
  }

  const rangeSize = next.threshold - current.threshold;
  const pointsIn = score - current.threshold;
  const progress = Math.min(100, Math.max(0, (pointsIn / rangeSize) * 100));
  const pointsToNext = next.threshold - score;

  return { currentRank: current.name, nextRank: next.name, progress, pointsToNext };
}

export default function ReputationBar({ reputation, factionName, factionColor }) {
  const { currentRank, nextRank, progress, pointsToNext } = getRankProgress(reputation.score);

  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" style={{ color: factionColor || "hsl(var(--primary))" }} />
          <span className="text-xs font-semibold text-foreground">{factionName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-primary">
            <Award className="h-3 w-3" />
            <span>{reputation.score} PTS</span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase">{currentRank}</Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-secondary rounded-sm overflow-hidden">
          <div
            className={`h-full rounded-sm transition-all duration-500 ${rankColor[currentRank] || "bg-primary"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">{currentRank}</span>
          {nextRank ? (
            <span>
              <span className="text-primary">{pointsToNext}</span> pts to{" "}
              <span className="uppercase text-foreground">{nextRank}</span>
            </span>
          ) : (
            <span className="text-primary">MAX RANK</span>
          )}
        </div>
      </div>
    </div>
  );
}