import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Crosshair, Coins, Star, TrendingUp } from "lucide-react";
import LeaderboardTable from "../components/records/LeaderboardTable";
import PlayerRankCard from "../components/records/PlayerRankCard";
import RecordStatCards from "../components/records/RecordStatCards";

export default function Records() {
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("credits");

  useEffect(() => {
    const load = async () => {
      const [me, users, jobs, repLogs, scavengeRuns, craftLogs, tradeRequests] = await Promise.all([
        base44.auth.me(),
        base44.entities.User.list("-created_date", 200),
        base44.entities.Job.filter({}, "-created_date", 500),
        base44.entities.ReputationLog.filter({}, "-created_date", 1000),
        base44.entities.ScavengeRun.filter({}, "-created_date", 500),
        base44.entities.CraftLog.filter({}, "-created_date", 500),
        base44.entities.TradeRequest.filter({ status: "accepted" }, "-created_date", 500),
      ]);

      setUser(me);

      // Build per-player stats
      const playerMap = {};
      for (const u of users) {
        if (!u.callsign && !u.is_onboarded) continue;
        playerMap[u.email] = {
          email: u.email,
          callsign: u.callsign || "Operative",
          credits_earned: 0,
          missions_completed: 0,
          missions_failed: 0,
          reputation_gained: 0,
          scavenge_runs: 0,
          scavenge_value: 0,
          items_crafted: 0,
          trades_completed: 0,
        };
      }

      // Missions
      for (const j of jobs) {
        if (!j.assigned_to || !playerMap[j.assigned_to]) continue;
        if (j.status === "completed") {
          playerMap[j.assigned_to].missions_completed += 1;
          playerMap[j.assigned_to].credits_earned += (j.reward_credits || 0);
        }
        if (j.status === "failed") {
          playerMap[j.assigned_to].missions_failed += 1;
        }
      }

      // Reputation gains
      for (const r of repLogs) {
        if (!r.player_email || !playerMap[r.player_email]) continue;
        if (r.delta > 0) {
          playerMap[r.player_email].reputation_gained += r.delta;
        }
      }

      // Scavenge runs
      for (const s of scavengeRuns) {
        if (!s.player_email || !playerMap[s.player_email]) continue;
        if (s.status === "completed") {
          playerMap[s.player_email].scavenge_runs += 1;
          playerMap[s.player_email].scavenge_value += (s.total_value || 0);
          playerMap[s.player_email].credits_earned += (s.total_value || 0);
        }
      }

      // Crafting
      for (const c of craftLogs) {
        if (!c.player_email || !playerMap[c.player_email]) continue;
        if (c.status === "success") {
          playerMap[c.player_email].items_crafted += 1;
          playerMap[c.player_email].credits_earned += (c.output_value || 0);
        }
      }

      // Trades
      for (const t of tradeRequests) {
        if (playerMap[t.sender_email]) playerMap[t.sender_email].trades_completed += 1;
        if (playerMap[t.receiver_email]) playerMap[t.receiver_email].trades_completed += 1;
      }

      setLeaderboard(Object.values(playerMap));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">COMPILING RECORDS...</div>
      </div>
    );
  }

  const categories = [
    { key: "credits", label: "CREDITS EARNED", icon: Coins, field: "credits_earned", suffix: "c" },
    { key: "missions", label: "MISSIONS DONE", icon: Crosshair, field: "missions_completed", suffix: "" },
    { key: "reputation", label: "REP GAINED", icon: Star, field: "reputation_gained", suffix: "" },
    { key: "scavenge", label: "SCAVENGE VALUE", icon: TrendingUp, field: "scavenge_value", suffix: "c" },
    { key: "crafting", label: "ITEMS CRAFTED", icon: Trophy, field: "items_crafted", suffix: "" },
    { key: "trades", label: "TRADES DONE", icon: Trophy, field: "trades_completed", suffix: "" },
  ];

  const activeCat = categories.find(c => c.key === category) || categories[0];
  const sorted = [...leaderboard].sort((a, b) => (b[activeCat.field] || 0) - (a[activeCat.field] || 0));
  const myRank = sorted.findIndex(p => p.email === user?.email) + 1;
  const myStats = leaderboard.find(p => p.email === user?.email);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Global Records
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Top-performing operatives across all sectors
        </p>
      </div>

      {/* Your rank */}
      {myStats && <PlayerRankCard stats={myStats} rank={myRank} totalPlayers={sorted.length} category={activeCat} />}

      {/* Community stats */}
      <RecordStatCards leaderboard={leaderboard} />

      {/* Leaderboard */}
      <LeaderboardTable
        players={sorted}
        categories={categories}
        activeCategory={category}
        onCategoryChange={setCategory}
        activeCat={activeCat}
        currentUserEmail={user?.email}
      />
    </div>
  );
}