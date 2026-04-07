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
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const userRecord = await base44.auth.me();
        const [territoryRows, factionRows, recentPlanRows, baseRows] = await Promise.all([
          base44.entities.Territory.list("-created_date", 100),
          base44.entities.Faction.list("-created_date", 50),
          userRecord?.email
            ? base44.entities.MissionPlan.filter({ planned_by: userRecord.email }, "-created_date", 10)
            : Promise.resolve([]),
          userRecord?.role === "admin"
            ? Promise.resolve([])
            : userRecord?.email
              ? base44.entities.PlayerBase.filter({ owner_email: userRecord.email })
              : Promise.resolve([]),
        ]);

        const survivorRows = userRecord?.role === "admin"
          ? await base44.entities.Survivor.filter({}, "-created_date", 200)
          : (await Promise.all(
              baseRows.map((baseRow) => base44.entities.Survivor.filter({ base_id: baseRow.id }, "-created_date", 100)),
            )).flat();

        if (cancelled) {
          return;
        }

        const uniqueSurvivors = Array.from(
          new Map(
            survivorRows
              .filter((survivor) => survivor.status === "active")
              .map((survivor) => [survivor.id, survivor]),
          ).values(),
        );

        setUser(userRecord);
        setSurvivors(uniqueSurvivors);
        setTerritories(territoryRows);
        setFactions(factionRows);
        setRecentPlans(recentPlanRows);
      } catch (err) {
        if (!cancelled) {
          toast({ title: "Planner load failed", description: err.message, variant: "destructive" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const allAssignedIds = Object.values(assignments).flat().map((survivor) => survivor.id);
  const currentAssigned = selectedTerritory ? (assignments[selectedTerritory.id] || []) : [];
  const currentAssignedSignature = currentAssigned.map((survivor) => survivor.id).sort().join("|");

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
        survivor_ids: currentAssigned.map((survivor) => survivor.id),
        operation_type: operationType,
      });
      if (res.data?.error) {
        throw new Error(res.data.error);
      }
      setAssessment(res.data);
    } catch (err) {
      toast({ title: "Risk calculation failed", description: err.message, variant: "destructive" });
    } finally {
      setAssessLoading(false);
    }
  }, [selectedTerritory?.id, currentAssignedSignature, operationType, toast]);

  useEffect(() => {
    const timer = setTimeout(calculateRisk, 400); // Debounce
    return () => clearTimeout(timer);
  }, [calculateRisk]);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const survivor = survivors.find((candidate) => candidate.id === draggableId);
    if (!survivor) return;

    const newAssignments = { ...assignments };

    if (source.droppableId !== "squad-pool") {
      const srcTerritoryId = source.droppableId.replace("territory-", "");
      newAssignments[srcTerritoryId] = (newAssignments[srcTerritoryId] || []).filter((candidate) => candidate.id !== draggableId);
    }

    if (destination.droppableId !== "squad-pool") {
      const destTerritoryId = destination.droppableId.replace("territory-", "");
      if (!newAssignments[destTerritoryId]) newAssignments[destTerritoryId] = [];
      if (!newAssignments[destTerritoryId].find((candidate) => candidate.id === draggableId)) {
        const nextAssignments = [...newAssignments[destTerritoryId]];
        nextAssignments.splice(destination.index, 0, survivor);
        newAssignments[destTerritoryId] = nextAssignments;
      }
    }

    setAssignments(newAssignments);
  };

  const handleRemoveSurvivor = (survivorId) => {
    if (!selectedTerritory) return;
    setAssignments((prev) => ({
      ...prev,
      [selectedTerritory.id]: (prev[selectedTerritory.id] || []).filter((survivor) => survivor.id !== survivorId),
    }));
  };

  const handleSelectTerritory = (territory) => {
    setSelectedTerritory(territory);
    setAssessment(null);
  };

  const handleGeneratePlan = async () => {
    if (!selectedTerritory || currentAssigned.length === 0 || !title) return;
    setIsGeneratingPlan(true);
    try {
      const res = await base44.functions.invoke("generateMissionPlan", {
        title,
        territory_id: selectedTerritory.id,
        operation_type: operationType,
        survivor_ids: currentAssigned.map((survivor) => survivor.id),
      });
      if (res.data?.error) {
        throw new Error(res.data.error);
      }
      const createdPlan = res.data?.plan;

      toast({ title: "Plan Generated", description: `${title} — ${currentAssigned.length} operatives are ready for assignment.` });

      setTitle("");
      setAssignments((prev) => ({ ...prev, [selectedTerritory.id]: [] }));
      setAssessment(null);

      if (createdPlan) {
        setRecentPlans((prev) => [createdPlan, ...prev.filter((plan) => plan.id !== createdPlan.id)].slice(0, 10));
      } else if (user?.email) {
        base44.entities.MissionPlan.filter({ planned_by: user.email }, "-created_date", 10)
          .then(setRecentPlans);
      }
    } catch (err) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingPlan(false);
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
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Mission Planner
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Drag operatives onto territories, configure operations, and assess risk before deployment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3">
            <SquadPool survivors={survivors} assignedIds={allAssignedIds} />
          </div>

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
                faction={factions.find((faction) => faction.id === selectedTerritory.controlling_faction_id)}
                assignedSurvivors={currentAssigned}
                onRemoveSurvivor={handleRemoveSurvivor}
              />
            )}
          </div>

          <div className="lg:col-span-4 space-y-3">
            <PlanSummary
              title={title} setTitle={setTitle}
              operationType={operationType} setOperationType={setOperationType}
              selectedTerritory={selectedTerritory}
              assignedCount={currentAssigned.length}
              assessment={assessment}
              onGeneratePlan={handleGeneratePlan}
              deploying={isGeneratingPlan}
            />
            <RiskGauge assessment={assessment} loading={assessLoading} />
          </div>
        </div>

        {recentPlans.length > 0 && (
          <div className="border border-border bg-card rounded-sm overflow-hidden">
            <div className="border-b border-border px-3 py-2 bg-secondary/50 flex items-center gap-2">
              <History className="h-3 w-3 text-primary" />
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
                Recent Operations
              </h3>
            </div>
            <div className="p-2 space-y-1">
              {recentPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm bg-secondary/20 border border-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Crosshair className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono font-semibold text-foreground truncate">{plan.title}</p>
                      <p className="text-[8px] text-muted-foreground">
                        {plan.territory_name} · {plan.operation_type} · {plan.assigned_survivors?.length || 0} ops
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono text-muted-foreground">{plan.success_probability}%</span>
                    {plan.status === "completed" ? (
                      <CheckCircle className="h-3 w-3 text-status-ok" />
                    ) : plan.status === "failed" ? (
                      <XCircle className="h-3 w-3 text-status-danger" />
                    ) : (
                      <Badge variant="outline" className="text-[7px] uppercase">{plan.status}</Badge>
                    )}
                    <span className="text-[8px] text-muted-foreground">{moment(plan.createdAt || plan.created_date).fromNow()}</span>
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
