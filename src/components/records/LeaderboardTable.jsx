import DataCard from "../terminal/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

const rankStyles = {
  1: "text-accent font-bold",
  2: "text-foreground font-semibold",
  3: "text-foreground font-semibold",
};

const rankIcons = {
  1: <Trophy className="h-3.5 w-3.5 text-accent" />,
  2: <Medal className="h-3.5 w-3.5 text-muted-foreground" />,
  3: <Award className="h-3.5 w-3.5 text-chart-5" />,
};

export default function LeaderboardTable({ players, categories, activeCategory, onCategoryChange, activeCat, currentUserEmail }) {
  return (
    <div className="space-y-3">
      {/* Category selector */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(c => (
          <Button
            key={c.key}
            variant={activeCategory === c.key ? "default" : "outline"}
            size="sm"
            className="text-[9px] uppercase tracking-wider h-7"
            onClick={() => onCategoryChange(c.key)}
          >
            <c.icon className="h-3 w-3 mr-1" /> {c.label}
          </Button>
        ))}
      </div>

      <DataCard title={`Leaderboard — ${activeCat.label}`}>
        {players.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">No operative data yet.</p>
        ) : (
          <div className="space-y-0.5">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-[8px] text-muted-foreground uppercase tracking-widest font-mono px-2 py-1 border-b border-border">
              <span className="col-span-1">#</span>
              <span className="col-span-4">OPERATIVE</span>
              <span className="col-span-2 text-right">{activeCat.label}</span>
              <span className="col-span-2 text-right">MISSIONS</span>
              <span className="col-span-2 text-right">REP</span>
              <span className="col-span-1 text-right">TRADES</span>
            </div>

            {players.slice(0, 50).map((p, i) => {
              const rank = i + 1;
              const isMe = p.email === currentUserEmail;

              return (
                <div
                  key={p.email}
                  className={`grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-sm text-[10px] font-mono transition-colors ${
                    isMe ? "bg-primary/10 border border-primary/20" : rank <= 3 ? "bg-secondary/40" : "hover:bg-secondary/20"
                  }`}
                >
                  {/* Rank */}
                  <span className={`col-span-1 flex items-center gap-1 ${rankStyles[rank] || "text-muted-foreground"}`}>
                    {rankIcons[rank] || <span className="text-[9px] pl-0.5">{rank}</span>}
                  </span>

                  {/* Name */}
                  <span className={`col-span-4 truncate ${isMe ? "text-primary font-semibold" : "text-foreground"}`}>
                    {p.callsign}
                    {isMe && <Badge className="ml-1.5 text-[7px] bg-primary/20 text-primary border-0 px-1">YOU</Badge>}
                  </span>

                  {/* Primary stat */}
                  <span className={`col-span-2 text-right font-semibold ${rank <= 3 ? "text-accent" : "text-foreground"}`}>
                    {(p[activeCat.field] || 0).toLocaleString()}{activeCat.suffix}
                  </span>

                  {/* Missions */}
                  <span className="col-span-2 text-right text-muted-foreground">
                    {p.missions_completed}
                  </span>

                  {/* Rep */}
                  <span className="col-span-2 text-right text-muted-foreground">
                    {p.reputation_gained}
                  </span>

                  {/* Trades */}
                  <span className="col-span-1 text-right text-muted-foreground">
                    {p.trades_completed}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </DataCard>
    </div>
  );
}