import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AuthLoadingState from "../components/terminal/AuthLoadingState";
import DataCard from "../components/terminal/DataCard";
import BaseCard from "../components/colony/BaseCard";
import SurvivorCard from "../components/colony/SurvivorCard";
import ColonyBonusSummary from "../components/colony/ColonyBonusSummary";
import BaseRegistrationForm from "../components/colony/BaseRegistrationForm";
import TaskAssigner from "../components/colony/TaskAssigner";
import TaskFeed from "../components/colony/TaskFeed";
import BaseDefenseStatus from "../components/colony/BaseDefenseStatus";
import { Home, Users, Plus, ChevronDown, ChevronUp, Shield, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Colony() {
  const [user, setUser] = useState(null);
  const [bases, setBases] = useState([]);
  const [survivors, setSurvivors] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      base44.auth.me(),
      base44.entities.PlayerBase.list("-created_date", 50),
      base44.entities.Survivor.list("-created_date", 200),
      base44.entities.Territory.list("-created_date", 100),
    ])
      .then(([u, b, s, t]) => {
        setUser(u);
        setBases(b);
        setSurvivors(s);
        setTerritories(t);
        // Auto-select first owned base
        const myBases = b.filter((base) => base.owner_email === u.email);
        if (myBases.length > 0 && !selectedBaseId) {
          setSelectedBaseId(myBases[0].id);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Survivor.subscribe((event) => {
      if (event.type === "create") {
        setSurvivors((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        setSurvivors((prev) => prev.map((s) => (s.id === event.id ? event.data : s)));
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return <AuthLoadingState message="SCANNING SETTLEMENT DATA..." />;
  }

  const myBases = bases.filter((b) => b.owner_email === user?.email);
  const selectedBase = bases.find((b) => b.id === selectedBaseId);
  const baseSurvivors = survivors.filter((s) => s.base_id === selectedBaseId);
  const activeSurvivors = baseSurvivors.filter((s) => s.status === "active");

  const totalSurvivors = survivors.filter((s) => s.status === "active" && myBases.some((b) => b.id === s.base_id)).length;
  const busyCount = survivors.filter(s => s.status === "active" && s.current_task && s.current_task !== "idle" && myBases.some(b => b.id === s.base_id)).length;
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Survivor Colony
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Your bases and the survivors who call them home
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border bg-card rounded-sm p-3 text-center">
          <Home className="h-4 w-4 mx-auto text-primary mb-1" />
          <div className="text-[9px] text-muted-foreground tracking-wider">YOUR BASES</div>
          <div className="text-lg font-bold text-foreground font-display">{myBases.length}</div>
        </div>
        <div className="border border-border bg-card rounded-sm p-3 text-center">
          <Users className="h-4 w-4 mx-auto text-accent mb-1" />
          <div className="text-[9px] text-muted-foreground tracking-wider">TOTAL SURVIVORS</div>
          <div className="text-lg font-bold text-foreground font-display">{totalSurvivors}</div>
        </div>
        <div className="border border-border bg-card rounded-sm p-3 text-center">
          <div className="text-[9px] text-muted-foreground tracking-wider">TOTAL CAPACITY</div>
          <div className="text-lg font-bold text-foreground font-display">
            {totalSurvivors}/{myBases.reduce((s, b) => s + (b.capacity || 5), 0)}
          </div>
        </div>
      </div>

      {/* New Base Form Toggle */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 text-[10px] font-mono text-primary hover:text-foreground transition-colors uppercase tracking-wider"
      >
        {showForm ? <ChevronUp className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        {showForm ? "HIDE FORM" : "ESTABLISH NEW BASE"}
      </button>

      {showForm && (
        <div className="border border-border bg-card rounded-sm p-4">
          <BaseRegistrationForm
            userEmail={user?.email}
            territories={territories}
            onCreated={() => { loadData(); setShowForm(false); }}
          />
        </div>
      )}

      {/* Bases + Detail */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Base List */}
        <div className={`space-y-3 ${selectedBaseId ? "lg:col-span-2" : "lg:col-span-5"}`}>
          {myBases.length === 0 ? (
            <DataCard title="No Bases">
              <p className="text-xs text-muted-foreground">
                You haven't established any bases yet. Use the form above to claim your first settlement.
              </p>
            </DataCard>
          ) : (
            <div className={`grid gap-3 ${selectedBaseId ? "grid-cols-1" : "md:grid-cols-2"}`}>
              {myBases.map((base) => (
                <BaseCard
                  key={base.id}
                  base={base}
                  survivors={survivors.filter((s) => s.base_id === base.id)}
                  territory={territories.find((t) => t.id === base.territory_id)}
                  selected={selectedBaseId === base.id}
                  onSelect={setSelectedBaseId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selected Base Detail */}
        {selectedBase && (
          <div className="lg:col-span-3 space-y-4">
            {/* Base Info */}
            <DataCard title={selectedBase.name}>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
                  {selectedBase.sector && <span>SECTOR: {selectedBase.sector}</span>}
                  <span>DEF: {selectedBase.defense_level || 1}</span>
                  <span>CAPACITY: {activeSurvivors.length}/{selectedBase.capacity || 5}</span>
                  <Badge variant="outline" className="text-[8px] uppercase">
                    {selectedBase.status}
                  </Badge>
                </div>

                {/* Capacity Bar */}
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (activeSurvivors.length / (selectedBase.capacity || 5)) * 100)}%` }}
                  />
                </div>
              </div>
            </DataCard>

            {/* Task Assignment */}
            <DataCard
              title="Task Assignment"
              headerRight={
                <span className="text-[9px] text-accent font-mono">
                  {baseSurvivors.filter(s => s.current_task && s.current_task !== "idle").length} working
                </span>
              }
            >
              <TaskAssigner survivors={baseSurvivors} onTaskAssigned={loadData} />
            </DataCard>

            {/* Task Feed */}
            <DataCard title="Task Log">
              <TaskFeed baseId={selectedBaseId} onRefresh={loadData} />
            </DataCard>

            {/* Defense Status */}
            <DataCard title="Defense Readiness">
              <BaseDefenseStatus baseId={selectedBaseId} isAdmin={isAdmin} />
            </DataCard>

            {/* Colony Bonuses */}
            <DataCard title="Active Bonuses">
              <ColonyBonusSummary survivors={baseSurvivors} />
            </DataCard>

            {/* Survivors */}
            <DataCard
              title={`Survivors (${activeSurvivors.length})`}
              headerRight={
                <span className="text-[9px] text-muted-foreground">
                  {baseSurvivors.filter((s) => s.status !== "active").length} inactive
                </span>
              }
            >
              {activeSurvivors.length === 0 ? (
                <p className="text-[10px] text-muted-foreground py-4 text-center">
                  No survivors yet. Build up your reputation and defenses to attract them.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {activeSurvivors.map((s) => (
                    <SurvivorCard key={s.id} survivor={s} />
                  ))}
                </div>
              )}

              {/* Departed / Injured */}
              {baseSurvivors.filter((s) => s.status !== "active").length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="text-[9px] text-muted-foreground tracking-wider uppercase mb-2">INACTIVE</div>
                  <div className="space-y-1">
                    {baseSurvivors.filter((s) => s.status !== "active").map((s) => (
                      <SurvivorCard key={s.id} survivor={s} compact />
                    ))}
                  </div>
                </div>
              )}
            </DataCard>
          </div>
        )}
      </div>
    </div>
  );
}