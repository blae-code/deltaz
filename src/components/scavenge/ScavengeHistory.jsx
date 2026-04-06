import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import LootResultCard from "./LootResultCard";

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
      <div className="border border-border border-dashed rounded-sm p-6 text-center">
        <p className="text-[10px] text-muted-foreground">No scavenge runs on record yet.</p>
        <p className="text-[9px] text-muted-foreground/60 mt-1">Deploy a scout from the panel to the left — your results will appear here.</p>
      </div>
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