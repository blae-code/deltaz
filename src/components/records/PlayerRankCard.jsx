import DataCard from "../terminal/DataCard";
import { Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const rankMedals = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function PlayerRankCard({ stats, rank, totalPlayers, category }) {
  const percentile = totalPlayers > 0 ? Math.round(((totalPlayers - rank) / totalPlayers) * 100) : 0;

  return (
    <DataCard title="Your Standing">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-sm border border-primary/30 bg-primary/10 flex items-center justify-center">
          {rank <= 3 ? (
            <span className="text-2xl">{rankMedals[rank]}</span>
          ) : (
            <Trophy className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-display text-primary">#{rank}</span>
            <Badge variant="outline" className="text-[8px] uppercase">{category.label}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {stats.callsign} — Top {100 - percentile}% of {totalPlayers} operatives
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold font-display text-accent">
            {(stats[category.field] || 0).toLocaleString()}{category.suffix}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 justify-end">
            <TrendingUp className="h-3 w-3" /> {category.label}
          </p>
        </div>
      </div>
    </DataCard>
  );
}