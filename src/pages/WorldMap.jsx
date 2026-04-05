import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import TerritoryPin from "../components/map/TerritoryPin";
import FactionFilter from "../components/map/FactionFilter";



export default function WorldMap() {
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [openPinId, setOpenPinId] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Territory.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Job.list("-created_date", 50),
      base44.entities.Event.list("-created_date", 50),
    ])
      .then(([t, f, j, e]) => {
        setTerritories(t);
        setFactions(f);
        setJobs(j);
        setEvents(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const getFaction = (id) => factions.find((f) => f.id === id);
  const getJobsForTerritory = (tId) => jobs.filter((j) => j.territory_id === tId && (j.status === "available" || j.status === "in_progress"));
  const getEventsForTerritory = (tId) => events.filter((e) => e.territory_id === tId && e.is_active);

  const filtered = selectedFaction
    ? territories.filter((t) => t.controlling_faction_id === selectedFaction)
    : territories;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">SCANNING SECTORS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Area of Operations
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Territory control and threat assessment</p>
      </div>

      {/* Faction Filter */}
      <FactionFilter
        factions={factions}
        selectedFactionId={selectedFaction}
        onSelect={setSelectedFaction}
      />

      {/* Territory Pins */}
      {filtered.length === 0 ? (
        <DataCard title="No Territories">
          <p className="text-xs text-muted-foreground">
            {selectedFaction ? "No territories controlled by this clan." : "No territories discovered yet."}
          </p>
        </DataCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const faction = getFaction(t.controlling_faction_id);
            return (
              <TerritoryPin
                key={t.id}
                territory={t}
                factionName={faction?.name || "UNCLAIMED"}
                factionColor={faction?.color}
                jobs={getJobsForTerritory(t.id)}
                events={getEventsForTerritory(t.id)}
                isOpen={openPinId === t.id}
                onToggle={() => setOpenPinId(openPinId === t.id ? null : t.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}