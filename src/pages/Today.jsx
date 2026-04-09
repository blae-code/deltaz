import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import useCurrentUser from "../hooks/useCurrentUser";
import PageShell from "../components/layout/PageShell";
import DataCard from "../components/terminal/DataCard";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import AuthLoadingState from "../components/terminal/AuthLoadingState";
import TodayInventory from "../components/today/TodayInventory";
import TodayColony from "../components/today/TodayColony";
import TodayActions from "../components/today/TodayActions";
import OperativeIdCard from "../components/today/OperativeIdCard";
import { getDisplayName } from "../lib/displayName";

export default function Today() {
  const { user, loading: authLoading } = useCurrentUser();

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
      {/* Identity card */}
      <OperativeIdCard user={user} factions={[]} reputations={[]} jobs={[]} />

      {/* Quick nav */}
      <TodayActions />

      {/* Main two-column layout */}
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
