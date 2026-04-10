import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageShell from "../components/layout/PageShell";
import DataCard from "../components/terminal/DataCard";
import MobileCommandToggle from "../components/mobile/MobileCommandToggle";
import MobileFactions from "../components/mobile/MobileFactions";
import { useIsMobile } from "@/hooks/use-mobile";
import FactionCard from "../components/factions/FactionCard";
import FactionDetailPanel from "../components/factions/FactionDetailPanel";
import TerminalLoader from "../components/terminal/TerminalLoader";
import { X } from "lucide-react";

export default function Factions() {
  const isMobile = useIsMobile();
  const [mobileCommand, setMobileCommand] = useState(false);
  const [factions, setFactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [reputations, setReputations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => { if (isMobile) setMobileCommand(true); }, [isMobile]);

  useEffect(() => {
    Promise.all([
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.User.list("-created_date", 200),
      base44.entities.Reputation.list("-created_date", 500),
      base44.auth.me(),
    ])
      .then(([f, u, r, me]) => {
        setFactions(f);
        setUsers(u);
        setReputations(r);
        setUser(me);
      })
      .finally(() => setLoading(false));
  }, []);

  // Members = players with trusted+ rep with this faction
  const getFactionMembers = (factionId) => {
    const memberEmails = new Set(
      reputations
        .filter(r => r.faction_id === factionId && ["trusted", "allied", "revered"].includes(r.rank))
        .map(r => r.player_email)
    );
    return users.filter(u => memberEmails.has(u.email));
  };

  const selectedFaction = factions.find(f => f.id === selectedId);

  if (loading) {
    return (
      <PageShell title="Clan Registry" subtitle="Known factions on the server">
        <TerminalLoader size="md" messages={["DECRYPTING CLAN DATA...", "LOADING ROSTER...", "READING STANDING ORDERS..."]} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Clan Registry"
      subtitle="Known factions and their registered members"
      actions={<MobileCommandToggle active={mobileCommand} onChange={setMobileCommand} />}
    >
      {mobileCommand ? (
        <MobileFactions
          factions={factions}
          reputations={reputations}
          users={users}
          user={user}
          onSelect={setSelectedId}
        />
      ) : (
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Faction card list */}
        <div className={`space-y-3 ${selectedId ? "lg:col-span-2" : "lg:col-span-5"}`}>
          {factions.length === 0 ? (
            <DataCard title="No Clans Registered">
              <p className="text-xs text-muted-foreground">No factions have been registered yet.</p>
            </DataCard>
          ) : (
            <div className={`grid gap-3 ${selectedId ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
              {factions.map(faction => (
                <FactionCard
                  key={faction.id}
                  faction={faction}
                  members={getFactionMembers(faction.id)}
                  selected={selectedId === faction.id}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedId && selectedFaction && (
          <div className="lg:col-span-3">
            <FactionDetailPanel
              faction={selectedFaction}
              members={getFactionMembers(selectedId)}
              reputations={reputations}
              userEmail={user?.email}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
      )}
    </PageShell>
  );
}