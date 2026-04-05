import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import ScavengeDeployPanel from "../components/scavenge/ScavengeDeployPanel";
import ScavengeHistory from "../components/scavenge/ScavengeHistory";
import MissionStats from "../components/missions/MissionStats";
import MissionFilters from "../components/missions/MissionFilters";
import MyMissionsPanel from "../components/missions/MyMissionsPanel";
import MissionCard from "../components/missions/MissionCard";
import MissionGenerator from "../components/missions/MissionGenerator";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [factionFilter, setFactionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showScavenge, setShowScavenge] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [scavengeKey, setScavengeKey] = useState(0);

  const loadData = async () => {
    const [j, t, f, u] = await Promise.all([
      base44.entities.Job.list("-created_date", 100),
      base44.entities.Territory.list("-created_date", 100),
      base44.entities.Faction.list("-created_date", 50),
      base44.auth.me(),
    ]);
    setJobs(j);
    setTerritories(t);
    setFactions(f);
    setUser(u);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const unsub = base44.entities.Job.subscribe((event) => {
      if (event.type === "create") {
        setJobs(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setJobs(prev => prev.map(j => j.id === event.id ? event.data : j));
      } else if (event.type === "delete") {
        setJobs(prev => prev.filter(j => j.id !== event.id));
      }
    });
    return unsub;
  }, []);

  const filtered = jobs.filter(j => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (typeFilter !== "all" && j.type !== typeFilter) return false;
    if (factionFilter !== "all" && j.faction_id !== factionFilter) return false;
    return true;
  });

  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">LOADING MISSION DATA...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Mission Board
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Accept missions, earn reputation, serve your clan</p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={showGenerator ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setShowGenerator(!showGenerator)}
          >
            <Sparkles className="h-3 w-3 mr-1" /> GENERATE
          </Button>
          <Button
            variant={showScavenge ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setShowScavenge(!showScavenge)}
          >
            <Search className="h-3 w-3 mr-1" /> SCAVENGE
          </Button>
        </div>
      </div>

      {/* Mission Generator */}
      {showGenerator && (
        <DataCard title="Mission Generator">
          <MissionGenerator onGenerated={loadData} />
        </DataCard>
      )}

      {/* Scavenge Panel */}
      {showScavenge && (
        <div className="grid md:grid-cols-2 gap-4">
          <DataCard title="Deploy Scout">
            <ScavengeDeployPanel
              territories={territories}
              factions={factions}
              onDeployed={() => setScavengeKey(k => k + 1)}
            />
          </DataCard>
          <DataCard title="Recent Scavenge Runs">
            <ScavengeHistory key={scavengeKey} userEmail={user?.email} />
          </DataCard>
        </div>
      )}

      {/* Stats */}
      <MissionStats jobs={jobs} userEmail={user?.email} />

      {/* My Active Missions */}
      <MyMissionsPanel
        jobs={jobs}
        factions={factions}
        territories={territories}
        userEmail={user?.email}
        isAdmin={isAdmin}
        onUpdate={loadData}
      />

      {/* Filters */}
      <MissionFilters
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        factionFilter={factionFilter}
        factions={factions}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onFactionChange={setFactionFilter}
      />

      {/* Mission List */}
      {filtered.length === 0 ? (
        <DataCard title="No Missions">
          <p className="text-xs text-muted-foreground">No missions match current filters.</p>
        </DataCard>
      ) : (
        <div className="grid gap-2">
          {filtered.map(job => (
            <MissionCard
              key={job.id}
              job={job}
              faction={factions.find(f => f.id === job.faction_id)}
              territory={territories.find(t => t.id === job.territory_id)}
              userEmail={user?.email}
              isAdmin={isAdmin}
              onUpdate={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}