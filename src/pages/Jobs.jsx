import { useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import useCurrentUser from "../hooks/useCurrentUser";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import PageShell from "../components/layout/PageShell";
import StatusStrip from "../components/layout/StatusStrip";
import MissionFilters from "../components/missions/MissionFilters";
import MyMissionsPanel from "../components/missions/MyMissionsPanel";
import MissionCard from "../components/missions/MissionCard";
import MissionToolsDrawer from "../components/missions/MissionToolsDrawer";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import EmptyState from "../components/terminal/EmptyState";
import { Filter, Sparkles, Package, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NextStepBanner from "../components/terminal/NextStepBanner";
import StatusStripSkeleton from "../components/layout/StatusStripSkeleton";
import AuthLoadingState from "../components/terminal/AuthLoadingState";

export default function Jobs() {
  const { user, isAdmin } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState("available");
  const [typeFilter, setTypeFilter] = useState("all");
  const [factionFilter, setFactionFilter] = useState("all");
  const [scavengeKey, setScavengeKey] = useState(0);

  const jobsQuery = useEntityQuery(
    "jobs",
    () => base44.entities.Job.list("-created_date", 100),
    { subscribeEntities: ["Job"] }
  );
  const { data: jobsData, isLoading: jobsLoading, syncMeta: jobsSyncMeta } = jobsQuery;
  const { data: territories } = useEntityQuery(
    "territories",
    () => base44.entities.Territory.list("-created_date", 100),
    { subscribeEntities: ["Territory"] }
  );
  const { data: factions } = useEntityQuery(
    "factions",
    () => base44.entities.Faction.list("-created_date", 50),
    { subscribeEntities: ["Faction"] }
  );

  const jobs = jobsData || [];
  const loading = jobsLoading && jobs.length === 0;

  useRegisterSync("jobs", jobsQuery);

  const filtered = jobs.filter(j => {
    if (!j?.id) return false; // Defensive: skip malformed records
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (typeFilter !== "all" && j.type !== typeFilter) return false;
    if (factionFilter !== "all" && j.faction_id !== factionFilter) return false;
    return true;
  });

  const myActive = jobs.filter(j => j.assigned_to === user?.email && j.status === "in_progress");
  const availableCount = jobs.filter(j => j.status === "available").length;
  const inProgressCount = jobs.filter(j => j.status === "in_progress").length;

  if (loading) {
    return (
      <PageShell title="Mission Board" subtitle="Accept missions, earn reputation, serve your clan">
        <StatusStripSkeleton count={4} />
        <SkeletonGrid count={5} variant="mission" />
      </PageShell>
    );
  }

  const statusItems = [
    { label: "AVAILABLE", value: availableCount, color: "text-primary" },
    { label: "IN PROGRESS", value: inProgressCount, color: "text-accent" },
    { label: "YOUR ACTIVE", value: myActive.length, color: "text-status-ok" },
    { label: "COMPLETED", value: jobs.filter(j => j.status === "completed").length, color: "text-foreground" },
  ];

  return (
    <PageShell
      title="Mission Board"
      subtitle="Accept a mission to earn reputation and credits for your clan"
      syncMeta={jobsSyncMeta}
      onRetry={() => jobsQuery.refetch()}
      statusStrip={<StatusStrip items={statusItems} />}
    >
      {/* 1. Your active missions — always visible if you have any */}
      {myActive.length > 0 && (
        <MyMissionsPanel
          jobs={jobs}
          factions={factions || []}
          territories={territories || []}
          userEmail={user?.email}
          isAdmin={isAdmin}
        />
      )}

      {/* 2. Filters — primary action: browse & accept */}
      <MissionFilters
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        factionFilter={factionFilter}
        factions={factions || []}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onFactionChange={setFactionFilter}
      />

      {/* 3. Mission list — the main content */}
      {filtered.length === 0 ? (
        jobs.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No Active Contracts"
            why="The board is empty. Missions appear here when faction leaders post contracts or when the AI war engine detects activity worth investigating."
            action="If you have GM access, use the tools below to forge a mission. Otherwise, check back — the wasteland doesn't stay quiet for long."
          />
        ) : (
          <EmptyState
            icon={Filter}
            title="No Missions Match Filters"
            why={`${jobs.length} mission${jobs.length !== 1 ? "s" : ""} on the board, but none match your current filter combo.`}
            action="Widen your filters — set Status, Type, or Faction back to 'All' to see what's available."
          />
        )
      ) : (
        <div className="grid gap-2.5">
          {filtered.map(job => (
            <MissionCard
              key={job.id}
              job={job}
              faction={(factions || []).find(f => f.id === job.faction_id)}
              territory={(territories || []).find(t => t.id === job.territory_id)}
              userEmail={user?.email}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* 4. Next-step continuity cues */}
      {myActive.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <NextStepBanner
            to="/inventory"
            icon={Package}
            label="Check your loadout"
            hint="Make sure your gear is ready before heading out."
            color="muted"
          />
          <NextStepBanner
            to="/trade"
            icon={ArrowLeftRight}
            label="Need supplies?"
            hint="Browse the Trade Hub for gear and materials."
            color="muted"
          />
        </div>
      )}

      {/* 5. GM Tools — subordinated at the bottom */}
      <MissionToolsDrawer
        jobs={jobs}
        userEmail={user?.email}
        territories={territories || []}
        factions={factions || []}
        scavengeKey={scavengeKey}
        onDeployed={() => setScavengeKey(k => k + 1)}
      />
    </PageShell>
  );
}