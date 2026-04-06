import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import LootResultCard from "./LootResultCard";
import EmptyState from "../terminal/EmptyState";
import { Compass } from "lucide-react";

export default function ScavengeHistory({ userEmail }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.ScavengeRun.filter({ player_email: userEmail }, "-created_date", 20)
      .then(setRuns)
      .finally(() => setLoading(false));

    const unsub = base44.entities.ScavengeRun.subscribe((event) => {
      if (event.type === "create" && event.data.player_email === userEmail) {
        setRuns((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        setRuns((prev) => prev.map((r) => (r.id === event.id ? event.data : r)));
      }
    });
    return unsub;
  }, [userEmail]);

  if (loading) {
    return <p className="text-[10px] text-muted-foreground animate-pulse">Loading scavenge history...</p>;
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="No Scavenge Runs Yet"
        why="You haven't deployed any scouts. Each scavenge run sends a team into a territory to search for loot, intel, and resources."
        action="Select a territory in the Deploy Scout panel and hit DEPLOY — results will appear here in seconds."
      />
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <LootResultCard key={run.id} run={run} />
      ))}
    </div>
  );
}