import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import useCurrentUser from "../hooks/useCurrentUser";
import useWorldState from "../hooks/useWorldState";
import PageShell from "../components/layout/PageShell";
import DataCard from "../components/terminal/DataCard";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import AuthLoadingState from "../components/terminal/AuthLoadingState";
import TodayInventory from "../components/today/TodayInventory";
import TodayColony from "../components/today/TodayColony";
import TodayActions from "../components/today/TodayActions";
import TodayAlerts from "../components/today/TodayAlerts";
import TodayMissions from "../components/today/TodayMissions";
import TodayWorldConditions from "../components/today/TodayWorldConditions";
import TodayPriorityBriefing from "../components/today/TodayPriorityBriefing";
import TodayEmergencyBanner from "../components/today/TodayEmergencyBanner";
import OperativeIdCard from "../components/today/OperativeIdCard";
import { getDisplayName } from "../lib/displayName";

export default function Today() {
  const { user, loading: authLoading } = useCurrentUser();
  const { data: worldConditions } = useWorldState();

  const inventoryQuery = useEntityQuery(
    ["today-inventory", user?.email],
    () => user ? base44.entities.InventoryItem.filter({ owner_email: user.email }, "-created_date", 200) : Promise.resolve([]),
    { subscribeEntities: ["InventoryItem"], syncPolicy: "active", queryOpts: { enabled: !!user?.email } }
  );
  const { data: inventory = [] } = inventoryQuery;

  const craftQuery = useEntityQuery(
    ["today-crafting", user?.email],
    () => user ? base44.entities.CraftingProject.filter({ owner_email: user.email }, "-created_date", 50) : Promise.resolve([]),
    { subscribeEntities: ["CraftingProject"], syncPolicy: "active", queryOpts: { enabled: !!user?.email } }
  );
  const { data: craftingProjects = [] } = craftQuery;

  const colonyQuery = useEntityQuery(
    ["today-colony", user?.email],
    () => user ? base44.entities.PlayerBase.filter({ owner_email: user.email }, "-created_date", 10) : Promise.resolve([]),
    { subscribeEntities: ["PlayerBase"], syncPolicy: "active", queryOpts: { enabled: !!user?.email } }
  );
  const { data: bases = [] } = colonyQuery;

  const survivorsQuery = useEntityQuery(
    "today-survivors",
    () => base44.entities.Survivor.list("-created_date", 200),
    { subscribeEntities: ["Survivor"], syncPolicy: "active" }
  );
  const { data: survivors = [] } = survivorsQuery;

  // ── Live feeds: jobs, factions, reputations, alerts, colony status ──
  const jobsQuery = useEntityQuery(
    "today-jobs",
    () => base44.entities.Job.list("-created_date", 50),
    { subscribeEntities: ["Job"], syncPolicy: "active" }
  );
  const { data: jobs = [] } = jobsQuery;

  const factionsQuery = useEntityQuery(
    "today-factions",
    () => base44.entities.Faction.list("-created_date", 50),
    { subscribeEntities: ["Faction"], syncPolicy: "passive" }
  );
  const { data: factions = [] } = factionsQuery;

  const reputationsQuery = useEntityQuery(
    ["today-reps", user?.email],
    () => user ? base44.entities.Reputation.filter({ player_email: user.email }, "-created_date", 50) : Promise.resolve([]),
    { subscribeEntities: ["Reputation"], syncPolicy: "active", queryOpts: { enabled: !!user?.email } }
  );
  const { data: reputations = [] } = reputationsQuery;

  const eventsQuery = useEntityQuery(
    "today-events",
    () => base44.entities.Event.list("-created_date", 10),
    { subscribeEntities: ["Event"], syncPolicy: "active" }
  );
  const { data: events = [] } = eventsQuery;

  const intelQuery = useEntityQuery(
    "today-intel",
    () => base44.entities.IntelFeed.list("-created_date", 10),
    { subscribeEntities: ["IntelFeed"], syncPolicy: "active" }
  );
  const { data: intel = [] } = intelQuery;

  const broadcastsQuery = useEntityQuery(
    "today-broadcasts",
    () => base44.entities.Broadcast.list("-created_date", 10),
    { subscribeEntities: ["Broadcast"], syncPolicy: "active" }
  );
  const { data: broadcasts = [] } = broadcastsQuery;

  const colonyStatusQuery = useEntityQuery(
    "today-colony-status",
    () => base44.entities.ColonyStatus.list("-updated_date", 1).then(r => r[0] || null),
    { subscribeEntities: ["ColonyStatus"], syncPolicy: "realtime" }
  );
  const { data: colonyStatus = null } = colonyStatusQuery;

  if (authLoading) {
    return (
      <PageShell title="Today" subtitle="Loading your command surface...">
        <AuthLoadingState />
      </PageShell>
    );
  }

  const isInitialLoad = inventoryQuery.isLoading && !inventoryQuery.data;
  if (isInitialLoad) {
    return (
      <PageShell title="Today" subtitle="Retrieving operational data...">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonGrid count={2} variant="inventory" />
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
    >
      {/* Emergency banner — top of page when colony is in danger */}
      <TodayEmergencyBanner colony={colonyStatus} />

      {/* Identity card — now with live factions, reps, jobs */}
      <OperativeIdCard user={user} factions={factions} reputations={reputations} jobs={jobs} />

      {/* Priority briefing — actionable items right now */}
      <TodayPriorityBriefing
        jobs={jobs}
        userEmail={user?.email}
        inventory={inventory}
        craftingProjects={craftingProjects}
        colony={colonyStatus}
      />

      {/* Quick nav */}
      <TodayActions />

      {/* World conditions — live weather, time, radiation */}
      <DataCard title="World Conditions" subtitle="Live server telemetry">
        <TodayWorldConditions conditions={worldConditions} />
      </DataCard>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <DataCard title="Active Missions" subtitle="Contracts & assignments">
          <TodayMissions jobs={jobs} userEmail={user?.email} />
        </DataCard>

        <DataCard title="Alerts & Intel" subtitle="Comms, events & threat reports">
          <TodayAlerts events={events} intel={intel} broadcasts={broadcasts} />
        </DataCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <DataCard title="Gear & Crafting" subtitle="Equipment status & active builds">
          <TodayInventory inventory={inventory} craftingProjects={craftingProjects} />
        </DataCard>

        <DataCard title="Colony Vitals" subtitle="Settlement status at a glance">
          <TodayColony bases={bases} survivors={survivors} />
        </DataCard>
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