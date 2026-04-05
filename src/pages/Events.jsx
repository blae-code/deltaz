import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import NewsFeedItem from "../components/newsfeed/NewsFeedItem";
import NewsFeedFilters from "../components/newsfeed/NewsFeedFilters";
import useNewsFeed from "../components/newsfeed/useNewsFeed";
import { Radio, Wifi } from "lucide-react";

export default function Events() {
  const { items, loading } = useNewsFeed();
  const [factions, setFactions] = useState([]);
  const [userFactionIds, setUserFactionIds] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [myFactionOnly, setMyFactionOnly] = useState(false);

  useEffect(() => {
    (async () => {
      const [f, u] = await Promise.all([
        base44.entities.Faction.list("-created_date", 50),
        base44.auth.me(),
      ]);
      setFactions(f);
      if (u?.email) {
        const reps = await base44.entities.Reputation.filter({ player_email: u.email });
        setUserFactionIds(
          reps.filter(r => ["trusted", "allied", "revered"].includes(r.rank)).map(r => r.faction_id)
        );
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (myFactionOnly && userFactionIds.length > 0) {
        if (!item.faction_id || !userFactionIds.includes(item.faction_id)) return false;
      }
      return true;
    });
  }, [items, categoryFilter, myFactionOnly, userFactionIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">INTERCEPTING GLOBAL CHANNELS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Global News Feed
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time combat reports, territory changes, and world events
          </p>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-status-ok animate-pulse" />
          <Wifi className="h-3 w-3" />
          <span className="tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Live counter */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{filtered.length} events</span>
        <span>·</span>
        <span>{items.length} total tracked</span>
        {myFactionOnly && <span className="text-primary">· Faction filter active</span>}
      </div>

      {/* Filters */}
      <NewsFeedFilters
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        myFactionOnly={myFactionOnly}
        setMyFactionOnly={setMyFactionOnly}
        userFactionIds={userFactionIds}
      />

      {/* Feed */}
      {filtered.length === 0 ? (
        <DataCard title="No Signals">
          <div className="text-center py-6">
            <Radio className="h-5 w-5 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-[10px] text-muted-foreground">
              {myFactionOnly ? "No events related to your faction." : "Channels are silent. Monitoring..."}
            </p>
          </div>
        </DataCard>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <NewsFeedItem key={item.id} item={item} factions={factions} />
          ))}
        </div>
      )}
    </div>
  );
}