import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import PageShell from "../components/layout/PageShell";
import DataCard from "../components/terminal/DataCard";
import StatusStripSkeleton from "../components/layout/StatusStripSkeleton";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import AuthLoadingState from "../components/terminal/AuthLoadingState";
import TodayMissions from "../components/today/TodayMissions";
import TodayAlerts from "../components/today/TodayAlerts";
import TodayInventory from "../components/today/TodayInventory";
import TodayColony from "../components/today/TodayColony";
import TodayActions from "../components/today/TodayActions";
import TodayPriorityBriefing from "../components/today/TodayPriorityBriefing";
import LiveEventWatcher from "../components/dashboard/LiveEventWatcher";
import OperativeIdCard from "../components/today/OperativeIdCard";
import { getDisplayName } from "../lib/displayName";

export default function Today() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthLoading(false); }).catch(() => setAuthLoading(false));
  }, []);

  // Core data queries
  const jobsQuery = useEntityQuery(
    "today-jobs",
    () => base44.entities.Job.list("-created_date", 50),
    { subscribeEntities: ["Job"] }
  );
  const { data: jobs = [] } = jobsQuery;

  const eventsQuery = useEntityQuery(
    "today-events",
    () => base44.entities.Event.list("-created_date", 10),
    { subscribeEntities: ["Event"] }
  );
  const { data: events = [] } = eventsQuery;

  const intelQuery = useEntityQuery(
    "today-intel",
    () => base44.entities.IntelFeed.list("-created_date", 10),
    { subscribeEntities: ["IntelFeed"] }
  );
  const { data: intel = [] } = intelQuery;

  const broadcastQuery = useEntityQuery(
    "today-broadcasts",
    () => base44.entities.Broadcast.list("-created_date", 5),
    { subscribeEntities: ["Broadcast"] }
  );
  const { data: broadcasts = [] } = broadcastQuery;

  const inventoryQuery = useEntityQuery(
    ["today-inventory", user?.email],
    () => user ? base44.entities.InventoryItem.filter({ owner_email: user.email }, "-created_date", 200) : Promise.resolve([]),
    { subscribeEntities: ["InventoryItem"], queryOpts: { enabled: !!user?.email } }
  );
  const { data: inventory = [] } = inventoryQuery;

  const craftQuery = useEntityQuery(
    ["today-crafting", user?.email],
    () => user ? base44.entities.CraftingProject.filter({ owner_email: user.email }, "-created_date", 50) : Promise.resolve([]),
    { subscribeEntities: ["CraftingProject"], queryOpts: { enabled: !!user?.email } }
  );
  const { data: craftingProjects = [] } = craftQuery;

  const colonyQuery = useEntityQuery(
    "today-colony",
    () => base44.entities.ColonyStatus.list("-updated_date", 1).then(r => r[0] || null),
    { subscribeEntities: ["ColonyStatus"] }
  );
  const { data: colony } = colonyQuery;

  const factionsQuery = useEntityQuery(
    "today-factions",
    () => base44.entities.Faction.list("-created_date", 50),
    { subscribeEntities: ["Faction"] }
  );
  const { data: factions = [] } = factionsQuery;

  const reputationsQuery = useEntityQuery(
    ["today-reputations", user?.email],
    () => user ? base44.entities.Reputation.filter({ player_email: user.email }) : Promise.resolve([]),
    { subscribeEntities: ["Reputation"], queryOpts: { enabled: !!user?.email } }
  );
  const { data: reputations = [] } = reputationsQuery;

  // Register primary sync
  useRegisterSync("today", jobsQuery);

  // Auth loading state — prevents empty flash
  if (authLoading) {
    return (
      <PageShell title="Today" subtitle="Loading your command surface...">
        <AuthLoadingState />
      </PageShell>
    );
  }

  // Initial data loading — show skeleton layout matching final shape
  const isInitialLoad = jobsQuery.isLoading && !jobsQuery.data;
  if (isInitialLoad) {
    return (
      <PageShell title="Today" subtitle="Retrieving operational data...">
        <StatusStripSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonGrid count={2} variant="mission" />
          <SkeletonGrid count={2} variant="default" />
        </div>
      </PageShell>
    );
  }

  const greeting = getGreeting();
  const displayName = user ? getDisplayName(user) : "Operative";

  return (
    <PageShell
      title="Today"
      subtitle={`${greeting}, ${displayName} — here's what matters right now`}
      syncMeta={jobsQuery.syncMeta}
      onRetry={() => jobsQuery.refetch()}
    >
      {/* Live event watcher (critical alerts only) */}
      {user?.email && <LiveEventWatcher userEmail={user.email} />}

      {/* Operative Identity Card */}
      <OperativeIdCard
        user={user}
        factions={factions}
        reputations={reputations}
        jobs={jobs}
      />

      {/* Priority Briefing — what matters right now */}
      <TodayPriorityBriefing
        jobs={jobs}
        userEmail={user?.email}
        inventory={inventory}
        craftingProjects={craftingProjects}
        colony={colony}
      />

      {/* Quick Actions */}
      <TodayActions />

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Left column — missions & gear */}
        <div className="space-y-4">
          <DataCard title="Active Ops" headerRight={<span className="text-[9px] text-muted-foreground font-mono">Your missions & available contracts</span>}>
            <TodayMissions jobs={jobs} userEmail={user?.email} />
          </DataCard>

          <DataCard title="Gear & Crafting" headerRight={<span className="text-[9px] text-muted-foreground font-mono">Equipment status & active builds</span>}>
            <TodayInventory inventory={inventory} craftingProjects={craftingProjects} />
          </DataCard>
        </div>

        {/* Right column — situation & colony */}
        <div className="space-y-4">
          <DataCard title="Situation Feed" headerRight={<span className="text-[9px] text-muted-foreground font-mono">Threats, intel, and comms</span>}>
            <TodayAlerts events={events} intel={intel} broadcasts={broadcasts} />
          </DataCard>

          <DataCard title="Colony Vitals" headerRight={<span className="text-[9px] text-muted-foreground font-mono">Settlement status at a glance</span>}>
            <TodayColony colony={colony} />
          </DataCard>
        </div>
      </div>
    </PageShell>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "Night watch";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}