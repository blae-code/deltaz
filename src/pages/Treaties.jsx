import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, ScrollText, RefreshCw, Network, Handshake, HeartPulse, Plus } from "lucide-react";
import RelationsMatrix from "../components/diplomacy/RelationsMatrix";
import RelationDetail from "../components/diplomacy/RelationDetail";
import TreatyCard from "../components/diplomacy/TreatyCard";
import TreatyProposalForm from "../components/diplomacy/TreatyProposalForm";
import AidRequestForm from "../components/diplomacy/AidRequestForm";
import AidRequestList from "../components/diplomacy/AidRequestList";

export default function Treaties() {
  const [treaties, setTreaties] = useState([]);
  const [factions, setFactions] = useState([]);
  const [diplomacy, setDiplomacy] = useState([]);
  const [aidRequests, setAidRequests] = useState([]);
  const [user, setUser] = useState(null);
  const [userFactionIds, setUserFactionIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("relations");
  const [showProposal, setShowProposal] = useState(false);
  const [showAidForm, setShowAidForm] = useState(false);
  const [selectedPair, setSelectedPair] = useState(null);
  const [treatyFilter, setTreatyFilter] = useState("active");

  const loadData = async () => {
    setLoading(true);
    const [u, f, d] = await Promise.all([
      base44.auth.me(),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Diplomacy.list("-created_date", 100),
    ]);
    setUser(u);
    setFactions(f.filter(x => x.status === "active" || x.status === "hostile"));
    setDiplomacy(d);

    if (u?.email) {
      const reps = await base44.entities.Reputation.filter({ player_email: u.email });
      const ids = reps
        .filter(r => ["trusted", "allied", "revered"].includes(r.rank))
        .map(r => r.faction_id);
      setUserFactionIds(ids);
    }

    const [treatyRes, aids] = await Promise.all([
      base44.functions.invoke("treatyEngine", { action: "list" }),
      base44.entities.AidRequest.list("-created_date", 100),
    ]);
    setTreaties(treatyRes.data.treaties || []);
    setAidRequests(aids);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub1 = base44.entities.Treaty.subscribe((event) => {
      if (event.type === "create") setTreaties(prev => [event.data, ...prev]);
      else if (event.type === "update") setTreaties(prev => prev.map(t => t.id === event.id ? event.data : t));
      else if (event.type === "delete") setTreaties(prev => prev.filter(t => t.id !== event.id));
    });
    const unsub2 = base44.entities.AidRequest.subscribe((event) => {
      if (event.type === "create") setAidRequests(prev => [event.data, ...prev]);
      else if (event.type === "update") setAidRequests(prev => prev.map(a => a.id === event.id ? event.data : a));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const filteredTreaties = treaties.filter(t => {
    if (treatyFilter === "active") return ["proposed", "negotiating", "accepted"].includes(t.status);
    if (treatyFilter === "pending") return ["proposed", "negotiating"].includes(t.status);
    if (treatyFilter === "signed") return t.status === "accepted";
    if (treatyFilter === "closed") return ["rejected", "expired", "revoked"].includes(t.status);
    return true;
  }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const pendingForMe = treaties.filter(
    t => ["proposed", "negotiating"].includes(t.status) && userFactionIds.includes(t.target_faction_id)
  ).length;

  const pendingAid = aidRequests.filter(
    a => a.status === "pending" && userFactionIds.includes(a.target_faction_id)
  ).length;

  const handlePairClick = (aId, bId, rel) => {
    setSelectedPair({ aId, bId, relation: rel });
  };

  if (loading) {
    return <div className="text-primary text-xs tracking-widest animate-pulse text-center py-8">DECRYPTING DIPLOMATIC CHANNELS...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Diplomacy Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Relations, treaties, aid requests, and faction diplomacy
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Alerts */}
      {(pendingForMe > 0 || pendingAid > 0) && (
        <div className="flex gap-3 flex-wrap">
          {pendingForMe > 0 && (
            <div className="border border-accent/40 bg-accent/10 rounded-sm px-3 py-2 flex items-center gap-2">
              <ScrollText className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-mono text-accent">
                {pendingForMe} treaty proposal{pendingForMe > 1 ? "s" : ""} awaiting response
              </span>
            </div>
          )}
          {pendingAid > 0 && (
            <div className="border border-primary/40 bg-primary/10 rounded-sm px-3 py-2 flex items-center gap-2">
              <HeartPulse className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono text-primary">
                {pendingAid} aid request{pendingAid > 1 ? "s" : ""} need your response
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "relations", label: "Relations", icon: Network },
          { key: "treaties", label: "Treaties", icon: FileSignature },
          { key: "aid", label: "Aid Requests", icon: HeartPulse },
        ].map(t => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setTab(t.key)}
          >
            <t.icon className="h-3 w-3 mr-1" /> {t.label}
            {t.key === "treaties" && pendingForMe > 0 && (
              <Badge className="ml-1 text-[8px] bg-accent/20 text-accent border-0 h-4 px-1">{pendingForMe}</Badge>
            )}
            {t.key === "aid" && pendingAid > 0 && (
              <Badge className="ml-1 text-[8px] bg-primary/20 text-primary border-0 h-4 px-1">{pendingAid}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* RELATIONS TAB */}
      {tab === "relations" && (
        <div className="space-y-4">
          <DataCard title="Faction Relations Matrix">
            <RelationsMatrix factions={factions} diplomacy={diplomacy} onPairClick={handlePairClick} />
          </DataCard>

          {selectedPair && (
            <DataCard
              title="Relationship Detail"
              headerRight={
                <button onClick={() => setSelectedPair(null)} className="text-[10px] text-muted-foreground hover:text-foreground">CLOSE</button>
              }
            >
              <RelationDetail
                relation={selectedPair.relation}
                factionA={factions.find(f => f.id === selectedPair.aId)}
                factionB={factions.find(f => f.id === selectedPair.bId)}
                treaties={treaties}
              />
            </DataCard>
          )}
        </div>
      )}

      {/* TREATIES TAB */}
      {tab === "treaties" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {["active", "pending", "signed", "closed", "all"].map(f => (
                <Button
                  key={f}
                  variant={treatyFilter === f ? "default" : "outline"}
                  size="sm"
                  className="text-[9px] uppercase tracking-wider h-6"
                  onClick={() => setTreatyFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
            {userFactionIds.length > 0 && (
              <Button
                variant={showProposal ? "default" : "outline"}
                size="sm"
                className="text-[10px] uppercase tracking-wider h-7"
                onClick={() => setShowProposal(!showProposal)}
              >
                <Plus className="h-3 w-3 mr-1" /> PROPOSE
              </Button>
            )}
          </div>

          {showProposal && (
            <DataCard title="Draft Treaty Proposal">
              <TreatyProposalForm
                factions={factions}
                userFactionIds={userFactionIds}
                onProposed={() => { setShowProposal(false); loadData(); }}
              />
            </DataCard>
          )}

          {filteredTreaties.length === 0 ? (
            <DataCard title="No Treaties">
              <p className="text-xs text-muted-foreground">No treaties match the current filter.</p>
            </DataCard>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredTreaties.map(treaty => (
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
      )}

      {/* AID REQUESTS TAB */}
      {tab === "aid" && (
        <div className="space-y-4">
          {userFactionIds.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant={showAidForm ? "default" : "outline"}
                size="sm"
                className="text-[10px] uppercase tracking-wider h-7"
                onClick={() => setShowAidForm(!showAidForm)}
              >
                <Plus className="h-3 w-3 mr-1" /> REQUEST AID
              </Button>
            </div>
          )}

          {showAidForm && (
            <DataCard title="Request Aid From Faction">
              <AidRequestForm
                factions={factions}
                userFactionIds={userFactionIds}
                userEmail={user?.email}
                onRequested={() => { setShowAidForm(false); loadData(); }}
              />
            </DataCard>
          )}

          {/* Incoming to my factions */}
          {userFactionIds.length > 0 && (
            <DataCard title="Incoming Requests">
              <AidRequestList
                requests={aidRequests.filter(a => userFactionIds.includes(a.target_faction_id))}
                factions={factions}
                userFactionIds={userFactionIds}
                onUpdate={loadData}
              />
            </DataCard>
          )}

          {/* Outgoing from my factions */}
          <DataCard title="Your Requests">
            <AidRequestList
              requests={aidRequests.filter(a => a.requester_email === user?.email)}
              factions={factions}
              userFactionIds={userFactionIds}
              onUpdate={loadData}
            />
          </DataCard>

          {/* All recent (for visibility) */}
          <DataCard title="All Recent Aid Activity">
            <AidRequestList
              requests={aidRequests.filter(a => a.status !== "pending").slice(0, 20)}
              factions={factions}
              userFactionIds={[]}
              onUpdate={loadData}
            />
          </DataCard>
        </div>
      )}
    </div>
  );
}