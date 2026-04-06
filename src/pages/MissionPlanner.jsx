import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext } from "@hello-pangea/dnd";
import SquadPool from "../components/planner/SquadPool";
import TerritorySlot from "../components/planner/TerritorySlot";
import TerritorySelector from "../components/planner/TerritorySelector";
import RiskGauge from "../components/planner/RiskGauge";
import PlanSummary from "../components/planner/PlanSummary";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Crosshair, History, CheckCircle, XCircle } from "lucide-react";
import moment from "moment";

export default function MissionPlanner() {
  const [user, setUser] = useState(null);
  const [survivors, setSurvivors] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentPlans, setRecentPlans] = useState([]);

  // Planning state
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [assignments, setAssignments] = useState({}); // { territoryId: [survivor objects] }
  const [title, setTitle] = useState("");
  const [operationType, setOperationType] = useState("recon");
  const [assessment, setAssessment] = useState(null);
  const [assessLoading, setAssessLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Survivor.filter({}, "-created_date", 200),
      base44.entities.Territory.list("-created_date", 100),
      base44.entities.Faction.list("-created_date", 50),
    ]).then(([u, s, t, f]) => {
      setUser(u);
      // Filter survivors to player's base
      const mySurvivors = s.filter(sv => sv.status === "active");
      setSurvivors(mySurvivors);
      setTerritories(t);
      setFactions(f);
      if (u?.email) {
        base44.entities.MissionPlan.filter({ planned_by: u.email }, "-created_date", 10)
          .then(setRecentPlans);
      }
    }).finally(() => setLoading(false));
  }, []);

  const allAssignedIds = Object.values(assignments).flat().map(s => s.id);
  const currentAssigned = selectedTerritory ? (assignments[selectedTerritory.id] || []) : [];

  // Auto-calculate risk when assignments or territory change
  const calculateRisk = useCallback(async () => {
    if (!selectedTerritory || currentAssigned.length === 0) {
      setAssessment(null);
      return;
    }
    setAssessLoading(true);
    try {
      const res = await base44.functions.invoke("riskAssessment", {
        territory_id: selectedTerritory.id,
        survivor_ids: currentAssigned.map(s => s.id),
        operation_type: operationType,
      });
      setAssessment(res.data);
    } catch (err) {
      toast({ title: "Risk calculation failed", description: err.message, variant: "destructive" });
    } finally {
      setAssessLoading(false);
    }
  }, [selectedTerritory?.id, currentAssigned.length, operationType, toast]);

  useEffect(() => {
    const timer = setTimeout(calculateRisk, 400); // Debounce
    return () => clearTimeout(timer);
  }, [calculateRisk]);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const survivor = survivors.find(s => s.id === draggableId);
    if (!survivor) return;

    // Remove from source
    const newAssignments = { ...assignments };

    if (source.droppableId === "squad-pool") {
      // Moving from pool to territory
    } else {
      // Moving from a territory slot
      const srcTerrId = source.droppableId.replace("territory-", "");
      newAssignments[srcTerrId] = (newAssignments[srcTerrId] || []).filter(s => s.id !== draggableId);
    }

    if (destination.droppableId === "squad-pool") {
      // Dropping back to pool — just remove from assignments (done above)
    } else {
      // Dropping into a territory
      const destTerrId = destination.droppableId.replace("territory-", "");
      if (!newAssignments[destTerrId]) newAssignments[destTerrId] = [];
      // Prevent duplicates
      if (!newAssignments[destTerrId].find(s => s.id === draggableId)) {
        const arr = [...newAssignments[destTerrId]];
        arr.splice(destination.index, 0, survivor);
        newAssignments[destTerrId] = arr;
      }
    }

    setAssignments(newAssignments);
  };

  const handleRemoveSurvivor = (survivorId) => {
    if (!selectedTerritory) return;
    setAssignments(prev => ({
      ...prev,
      [selectedTerritory.id]: (prev[selectedTerritory.id] || []).filter(s => s.id !== survivorId),
    }));
  };

  const handleSelectTerritory = (terr) => {
    setSelectedTerritory(terr);
    setAssessment(null);
  };

  const handleDeploy = async () => {
    if (!selectedTerritory || currentAssigned.length === 0 || !title) return;
    setDeploying(true);
    try {
      await base44.entities.MissionPlan.create({
        title,
        territory_id: selectedTerritory.id,
        territory_name: selectedTerritory.name,
        operation_type: operationType,
        assigned_survivors: currentAssigned.map(s => ({
          survivor_id: s.id, name: s.name, skill: s.skill, combat_rating: s.combat_rating || 1
        })),
        risk_score: assessment?.risk_score || 50,
        success_probability: assessment?.success_probability || 50,
        risk_factors: assessment?.risk_factors || [],
        status: "deployed",
        planned_by: user.email,
        deployed_at: new Date().toISOString(),
      });
      toast({ title: "Operation Deployed", description: `${title} — ${currentAssigned.length} operatives en route to ${selectedTerritory.name}` });

      // Reset
      setTitle("");
      setAssignments(prev => ({ ...prev, [selectedTerritory.id]: [] }));
      setAssessment(null);
      // Refresh recent plans
      base44.entities.MissionPlan.filter({ planned_by: user.email }, "-created_date", 10)
        .then(setRecentPlans);
    } catch (err) {
      toast({ title: "Deployment failed", description: err.message, variant: "destructive" });
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">INITIALIZING PLANNING TABLE...</div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Mission Planner
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Drag operatives onto territories, configure operations, and assess risk before deployment
          </p>
        </div>

        {/* Main 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Squad Pool */}
          <div className="lg:col-span-3">
            <SquadPool survivors={survivors} assignedIds={allAssignedIds} />
          </div>

          {/* CENTER: Territory & Drop Zone */}
          <div className="lg:col-span-5 space-y-3">
            <TerritorySelector
              territories={territories}
              factions={factions}
              selectedId={selectedTerritory?.id}
              onSelect={handleSelectTerritory}
            />

            {selectedTerritory && (
              <TerritorySlot
                territory={selectedTerritory}
                faction={factions.find(f => f.id === selectedTerritory.controlling_faction_id)}
                assignedSurvivors={currentAssigned}
                onRemoveSurvivor={handleRemoveSurvivor}
              />
            )}
          </div>

          {/* RIGHT: Risk + Deploy */}
          <div className="lg:col-span-4 space-y-3">
            <PlanSummary
              title={title} setTitle={setTitle}
              operationType={operationType} setOperationType={setOperationType}
              selectedTerritory={selectedTerritory}
              assignedCount={currentAssigned.length}
              assessment={assessment}
              onDeploy={handleDeploy}
              deploying={deploying}
            />
            <RiskGauge assessment={assessment} loading={assessLoading} />
          </div>
        </div>

        {/* Recent plans */}
        {recentPlans.length > 0 && (
          <div className="border border-border bg-card rounded-sm overflow-hidden">
            <div className="border-b border-border px-3 py-2 bg-secondary/50 flex items-center gap-2">
              <History className="h-3 w-3 text-primary" />
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
                Recent Operations
              </h3>
            </div>
            <div className="p-2 space-y-1">
              {recentPlans.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm bg-secondary/20 border border-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Crosshair className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono font-semibold text-foreground truncate">{p.title}</p>
                      <p className="text-[8px] text-muted-foreground">
                        {p.territory_name} · {p.operation_type} · {p.assigned_survivors?.length || 0} ops
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono text-muted-foreground">{p.success_probability}%</span>
                    {p.status === "completed" ? (
                      <CheckCircle className="h-3 w-3 text-status-ok" />
                    ) : p.status === "failed" ? (
                      <XCircle className="h-3 w-3 text-status-danger" />
                    ) : (
                      <Badge variant="outline" className="text-[7px] uppercase">{p.status}</Badge>
                    )}
                    <span className="text-[8px] text-muted-foreground">{moment(p.deployed_at || p.created_date).fromNow()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}