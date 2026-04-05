import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import IntelCard from "../components/intel/IntelCard";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw, Loader2 } from "lucide-react";

export default function Intel() {
  const [items, setItems] = useState([]);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.entities.IntelFeed.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Territory.list("-created_date", 50),
      base44.auth.me(),
    ]).then(([i, f, t, u]) => {
      setItems(i);
      setFactions(f);
      setTerritories(t);
      setUser(u);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  // Subscribe to new intel in real-time
  useEffect(() => {
    const unsub = base44.entities.IntelFeed.subscribe((ev) => {
      if (ev.type === "create") {
        setItems((prev) => [ev.data, ...prev].slice(0, 50));
      }
    });
    return unsub;
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    await base44.functions.invoke("worldPulse", {});
    // Real-time subscription will pick up new items
    setTimeout(() => setGenerating(false), 3000);
  };

  const getFaction = (id) => factions.find((f) => f.id === id)?.name;
  const getTerritory = (id) => territories.find((t) => t.id === id)?.name;

  const categories = ["all", "rumor", "mission_brief", "faction_intel", "world_event", "anomaly_report", "tactical_advisory"];
  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">DECRYPTING INTEL FEED...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Intelligence Feed
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            AI-analyzed field reports, rumors, and tactical assessments
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="text-[10px] uppercase tracking-wider"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {generating ? "ANALYZING..." : "GHOST PROTOCOL"}
          </Button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((c) => (
          <Button
            key={c}
            variant={filter === c ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setFilter(c)}
          >
            {c.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Intel items */}
      {filtered.length === 0 ? (
        <DataCard title="No Intel">
          <p className="text-xs text-muted-foreground">
            {filter === "all"
              ? "No intelligence reports available. GHOST PROTOCOL has not yet generated any intel."
              : "No intel matching this category."}
          </p>
        </DataCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <IntelCard
              key={item.id}
              item={item}
              factionName={getFaction(item.related_faction_id)}
              territoryName={getTerritory(item.related_territory_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}