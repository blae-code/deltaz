import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import FactionCard from "../components/factions/FactionCard";
import FactionDetailPanel from "../components/factions/FactionDetailPanel";
import DiplomacyTensionChart from "../components/factions/DiplomacyTensionChart";
import { X } from "lucide-react";

export default function Factions() {
  const [factions, setFactions] = useState([]);
  const [diplomacy, setDiplomacy] = useState([]);
  const [economies, setEconomies] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [users, setUsers] = useState([]);
  const [reputations, setReputations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Diplomacy.list("-created_date", 50),
      base44.entities.FactionEconomy.list("-created_date", 50),
      base44.entities.Territory.list("-created_date", 100),
      base44.entities.User.list("-created_date", 200),
      base44.entities.Reputation.list("-created_date", 500),
    ])
      .then(([f, d, e, t, u, r]) => {
        setFactions(f);
        setDiplomacy(d);
        setEconomies(e);
        setTerritories(t);
        setUsers(u);
        setReputations(r);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedFaction = factions.find((f) => f.id === selectedId);
  const selectedEconomy = economies.find((e) => e.faction_id === selectedId);

  // Determine faction members: users whose reputation with this faction is "trusted" or better, or who declared loyalty
  const getFactionMembers = (factionId) => {
    const loyalReps = reputations.filter(
      (r) => r.faction_id === factionId && ["trusted", "allied", "revered"].includes(r.rank)
    );
    const memberEmails = new Set(loyalReps.map((r) => r.player_email));
    return users.filter((u) => memberEmails.has(u.email));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">DECRYPTING CLAN DATA...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Clan Registry
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Known clans, their standings, and diplomatic relationships
        </p>
      </div>

      {/* Diplomatic Tension Chart */}
      <DataCard
        title="Diplomatic Tension Map"
        headerRight={
          selectedFaction && (
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> CLEAR
            </button>
          )
        }
      >
        <DiplomacyTensionChart
          factions={factions}
          relations={diplomacy}
          selectedFactionId={selectedId}
          onSelectFaction={setSelectedId}
        />
      </DataCard>

      {/* Main Content: Cards + Detail */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Faction Cards List */}
        <div className={`space-y-3 ${selectedId ? "lg:col-span-2" : "lg:col-span-5"}`}>
          {factions.length === 0 ? (
            <DataCard title="No Clans">
              <p className="text-xs text-muted-foreground">No clans registered in the system.</p>
            </DataCard>
          ) : (
            <div className={`grid gap-3 ${selectedId ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
              {factions.map((faction) => (
                <FactionCard
                  key={faction.id}
                  faction={faction}
                  economy={economies.find((e) => e.faction_id === faction.id)}
                  territories={territories}
                  members={getFactionMembers(faction.id)}
                  diplomacy={diplomacy}
                  factions={factions}
                  selected={selectedId === faction.id}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedId && selectedFaction && (
          <div className="lg:col-span-3">
            <FactionDetailPanel
              faction={selectedFaction}
              economy={selectedEconomy}
              territories={territories}
              members={getFactionMembers(selectedId)}
              diplomacy={diplomacy}
              factions={factions}
            />
          </div>
        )}
      </div>
    </div>
  );
}