import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageShell from "../components/layout/PageShell";
import DataCard from "../components/terminal/DataCard";
import MobileCommandToggle from "../components/mobile/MobileCommandToggle";
import MobileColony from "../components/mobile/MobileColony";
import { useIsMobile } from "@/hooks/use-mobile";
import TerminalLoader from "../components/terminal/TerminalLoader";
import BaseCard from "../components/colony/BaseCard";
import SurvivorCard from "../components/colony/SurvivorCard";
import BaseRegistrationForm from "../components/colony/BaseRegistrationForm";
import { Home, Users, Shield, Plus, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Active v1: PlayerBase + Survivor (player-entered real data only).
// Simulation layers stripped: ColonyStatus, Territory, BaseModule, TaskAssigner,
// TaskFeed, BaseDefenseStatus, ColonyVitalsPanel, ResourceHistoryFeed,
// ColonyBonusSummary, SkillGapDashboard.

export default function Colony() {
  const isMobile = useIsMobile();
  const [mobileCommand, setMobileCommand] = useState(false);
  const [user, setUser] = useState(null);
  const [bases, setBases] = useState([]);
  const [survivors, setSurvivors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.auth.me(),
      base44.entities.PlayerBase.list("-created_date", 50),
      base44.entities.Survivor.list("-created_date", 200),
    ])
      .then(([u, b, s]) => {
        setUser(u);
        setBases(b);
        setSurvivors(s);
        const myBases = b.filter(base => base.owner_email === u.email);
        if (myBases.length > 0 && !selectedBaseId) {
          setSelectedBaseId(myBases[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isMobile) setMobileCommand(true); }, [isMobile]);

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Survivor.subscribe((event) => {
      if (event.type === "create") setSurvivors(prev => [event.data, ...prev]);
      else if (event.type === "update") setSurvivors(prev => prev.map(s => s.id === event.id ? event.data : s));
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <PageShell title="Colony" subtitle="Settlement roster & survivor assignments">
        <TerminalLoader size="lg" messages={["SCANNING SETTLEMENT DATA...", "LOADING SURVIVOR ROSTER...", "MAPPING BASE LOCATIONS..."]} />
      </PageShell>
    );
  }

  const myBases = bases.filter(b => b.owner_email === user?.email);
  const selectedBase = bases.find(b => b.id === selectedBaseId);
  const baseSurvivors = survivors.filter(s => s.base_id === selectedBaseId);
  const activeSurvivors = baseSurvivors.filter(s => s.status === "active");

  const totalSurvivors = survivors.filter(
    s => s.status === "active" && myBases.some(b => b.id === s.base_id)
  ).length;
  const totalCapacity = myBases.reduce((sum, b) => sum + (b.capacity || 5), 0);

  return (
    <PageShell
      title="Colony"
      subtitle="Settlement roster & survivor assignments"
      actions={<MobileCommandToggle active={mobileCommand} onChange={setMobileCommand} />}
    >
      {mobileCommand ? (
        <MobileColony
          bases={bases}
          survivors={survivors}
          modules={[]}
          user={user}
          selectedBaseId={selectedBaseId}
          onSelectBase={setSelectedBaseId}
        />
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="panel-frame p-3 text-center">
              <Home className="h-4 w-4 mx-auto text-primary mb-1" />
              <div className="text-[9px] text-muted-foreground tracking-wider">YOUR BASES</div>
              <div className="text-lg font-bold text-foreground font-display">{myBases.length}</div>
            </div>
            <div className="panel-frame p-3 text-center">
              <Users className="h-4 w-4 mx-auto text-accent mb-1" />
              <div className="text-[9px] text-muted-foreground tracking-wider">SURVIVORS</div>
              <div className="text-lg font-bold text-foreground font-display">{totalSurvivors}</div>
            </div>
            <div className="panel-frame p-3 text-center">
              <Shield className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <div className="text-[9px] text-muted-foreground tracking-wider">CAPACITY</div>
              <div className="text-lg font-bold text-foreground font-display">
                {totalSurvivors}/{totalCapacity}
              </div>
            </div>
          </div>

          {/* New Base Toggle */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 text-[10px] font-mono text-primary hover:text-foreground transition-colors uppercase tracking-wider"
          >
            {showForm ? <ChevronUp className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showForm ? "HIDE FORM" : "ESTABLISH NEW BASE"}
          </button>

          {showForm && (
            <div className="panel-frame p-4">
              <BaseRegistrationForm
                userEmail={user?.email}
                territories={[]}
                onCreated={() => { loadData(); setShowForm(false); }}
              />
            </div>
          )}

          {/* Base List + Detail */}
          <div className="grid lg:grid-cols-5 gap-4">
            {/* Base list */}
            <div className={`space-y-3 ${selectedBaseId ? "lg:col-span-2" : "lg:col-span-5"}`}>
              {myBases.length === 0 ? (
                <DataCard title="No Bases">
                  <p className="text-xs text-muted-foreground">
                    No bases established yet. Use the form above to register your first settlement.
                  </p>
                </DataCard>
              ) : (
                <div className={`grid gap-3 ${selectedBaseId ? "grid-cols-1" : "md:grid-cols-2"}`}>
                  {myBases.map(base => (
                    <BaseCard
                      key={base.id}
                      base={base}
                      survivors={survivors.filter(s => s.base_id === base.id)}
                      territory={null}
                      selected={selectedBaseId === base.id}
                      onSelect={setSelectedBaseId}
                      moduleCount={0}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Selected base detail */}
            {selectedBase && (
              <div className="lg:col-span-3 space-y-4">

                {/* Base summary */}
                <DataCard title={selectedBase.name}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
                      {selectedBase.sector && <span>SECTOR: {selectedBase.sector}</span>}
                      <span>DEF LVL: {selectedBase.defense_level || 1}</span>
                      <span>CAPACITY: {activeSurvivors.length}/{selectedBase.capacity || 5}</span>
                      <Badge variant="outline" className="text-[8px] uppercase">
                        {selectedBase.status}
                      </Badge>
                    </div>
                    <div className="h-2 bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (activeSurvivors.length / (selectedBase.capacity || 5)) * 100)}%` }}
                      />
                    </div>
                    {selectedBase.notes && (
                      <p className="text-[10px] text-muted-foreground/70 italic">{selectedBase.notes}</p>
                    )}
                  </div>
                </DataCard>

                {/* Survivor roster */}
                <DataCard
                  title={`Survivors (${activeSurvivors.length})`}
                  headerRight={
                    baseSurvivors.filter(s => s.status !== "active").length > 0
                      ? <span className="text-[9px] text-muted-foreground">
                          {baseSurvivors.filter(s => s.status !== "active").length} inactive
                        </span>
                      : null
                  }
                >
                  {activeSurvivors.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground py-4 text-center">
                      No survivors assigned to this base yet.
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {activeSurvivors.map(s => (
                        <SurvivorCard key={s.id} survivor={s} />
                      ))}
                    </div>
                  )}

                  {baseSurvivors.filter(s => s.status !== "active").length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <div className="text-[9px] text-muted-foreground tracking-wider uppercase mb-2">INACTIVE</div>
                      <div className="space-y-1">
                        {baseSurvivors.filter(s => s.status !== "active").map(s => (
                          <SurvivorCard key={s.id} survivor={s} compact />
                        ))}
                      </div>
                    </div>
                  )}
                </DataCard>
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
