import { Crosshair, Coins, Star, Users } from "lucide-react";

export default function RecordStatCards({ leaderboard }) {
  const totalCredits = leaderboard.reduce((s, p) => s + (p.credits_earned || 0), 0);
  const totalMissions = leaderboard.reduce((s, p) => s + (p.missions_completed || 0), 0);
  const totalRep = leaderboard.reduce((s, p) => s + (p.reputation_gained || 0), 0);
  const activePlayers = leaderboard.filter(p => p.missions_completed > 0 || p.scavenge_runs > 0).length;

  const stats = [
    { label: "ACTIVE OPERATIVES", value: activePlayers, icon: Users, color: "text-primary" },
    { label: "TOTAL CREDITS", value: `${totalCredits.toLocaleString()}c`, icon: Coins, color: "text-accent" },
    { label: "MISSIONS DONE", value: totalMissions, icon: Crosshair, color: "text-primary" },
    { label: "REP EARNED", value: totalRep.toLocaleString(), icon: Star, color: "text-accent" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.label} className="border border-border rounded-sm p-3 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-mono">{s.label}</span>
          </div>
          <p className={`text-lg font-bold font-display ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}