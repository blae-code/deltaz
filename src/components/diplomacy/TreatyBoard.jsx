import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import TreatyCard from "./TreatyCard";
import TreatyProposalForm from "./TreatyProposalForm";
import DataCard from "../terminal/DataCard";
import { Button } from "@/components/ui/button";
import { FileSignature, ScrollText, RefreshCw } from "lucide-react";

export default function TreatyBoard() {
  const [treaties, setTreaties] = useState([]);
  const [factions, setFactions] = useState([]);
  const [user, setUser] = useState(null);
  const [userFactionIds, setUserFactionIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProposal, setShowProposal] = useState(false);
  const [filter, setFilter] = useState("active");

  const loadData = async () => {
    setLoading(true);
    const [u, f] = await Promise.all([
      base44.auth.me(),
      base44.entities.Faction.list("-created_date", 50),
    ]);
    setUser(u);
    setFactions(f.filter(x => x.status === "active"));

    // Get user's faction standings
    if (u?.email) {
      const reps = await base44.entities.Reputation.filter({ player_email: u.email });
      const ids = reps
        .filter(r => ["trusted", "allied", "revered"].includes(r.rank))
        .map(r => r.faction_id);
      setUserFactionIds(ids);
    }

    // Load treaties
    const res = await base44.functions.invoke("treatyEngine", { action: "list" });
    setTreaties(res.data.treaties || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Treaty.subscribe((event) => {
      if (event.type === "create") {
        setTreaties(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setTreaties(prev => prev.map(t => t.id === event.id ? event.data : t));
      } else if (event.type === "delete") {
        setTreaties(prev => prev.filter(t => t.id !== event.id));
      }
    });
    return unsub;
  }, []);

  const filtered = treaties.filter(t => {
    if (filter === "active") return ["proposed", "negotiating", "accepted"].includes(t.status);
    if (filter === "pending") return ["proposed", "negotiating"].includes(t.status);
    if (filter === "signed") return t.status === "accepted";
    if (filter === "closed") return ["rejected", "expired", "revoked"].includes(t.status);
    return true;
  }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Count pending treaties targeting user's factions
  const pendingForMe = treaties.filter(
    t => ["proposed", "negotiating"].includes(t.status) && userFactionIds.includes(t.target_faction_id)
  ).length;

  if (loading) {
    return <div className="text-primary text-xs tracking-widest animate-pulse text-center py-8">DECRYPTING TREATY ARCHIVES...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Treaty Chamber
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Formal diplomatic agreements between clans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {userFactionIds.length > 0 && (
            <Button
              variant={showProposal ? "default" : "outline"}
              size="sm"
              className="text-[10px] uppercase tracking-wider h-7"
              onClick={() => setShowProposal(!showProposal)}
            >
              <FileSignature className="h-3 w-3 mr-1" />
              PROPOSE TREATY
            </Button>
          )}
        </div>
      </div>

      {/* Pending alert */}
      {pendingForMe > 0 && (
        <div className="border border-accent/40 bg-accent/10 rounded-sm px-4 py-2.5 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-accent" />
          <span className="text-xs font-mono text-accent">
            {pendingForMe} treaty proposal{pendingForMe > 1 ? "s" : ""} awaiting your response
          </span>
        </div>
      )}

      {/* Proposal form */}
      {showProposal && (
        <DataCard title="Draft Treaty Proposal">
          <TreatyProposalForm
            factions={factions}
            userFactionIds={userFactionIds}
            onProposed={() => { setShowProposal(false); loadData(); }}
          />
        </DataCard>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "active", label: "ACTIVE" },
          { key: "pending", label: "PENDING" },
          { key: "signed", label: "SIGNED" },
          { key: "closed", label: "CLOSED" },
          { key: "all", label: "ALL" },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Treaty list */}
      {filtered.length === 0 ? (
        <DataCard title="No Treaties">
          <p className="text-xs text-muted-foreground">No treaties match the current filter.</p>
        </DataCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(treaty => (
            <TreatyCard
              key={treaty.id}
              treaty={treaty}
              factions={factions}
              userEmail={user?.email}
              userFactionIds={userFactionIds}
              onUpdate={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}