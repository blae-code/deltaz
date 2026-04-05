import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import LootResultCard from "../scavenge/LootResultCard";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";

export default function ScavengeLog() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user?.email) {
        base44.entities.ScavengeRun.filter({ player_email: user.email }, "-created_date", 5)
          .then(setRuns)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const unsub = base44.entities.ScavengeRun.subscribe((event) => {
      if (event.type === "create") {
        setRuns((prev) => [event.data, ...prev].slice(0, 5));
      } else if (event.type === "update") {
        setRuns((prev) => prev.map((r) => (r.id === event.id ? event.data : r)));
      }
    });
    return unsub;
  }, []);

  return (
    <DataCard
      title="Scavenge Log"
      headerRight={
        <Link to="/jobs" className="text-[9px] text-primary hover:underline">
          DEPLOY →
        </Link>
      }
    >
      {loading ? (
        <p className="text-[10px] text-muted-foreground animate-pulse">Loading runs...</p>
      ) : runs.length === 0 ? (
        <div className="text-center py-4">
          <Package className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-[10px] text-muted-foreground">No scavenge runs yet.</p>
          <Link to="/jobs" className="text-[10px] text-primary hover:underline">Deploy your first scout →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <LootResultCard key={run.id} run={run} compact />
          ))}
        </div>
      )}
    </DataCard>
  );
}