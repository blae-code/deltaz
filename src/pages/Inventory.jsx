import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeftRight, Hammer } from "lucide-react";
import NextStepBanner from "../components/terminal/NextStepBanner";
import PageShell from "../components/layout/PageShell";
import StatusStrip from "../components/layout/StatusStrip";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import InventoryGrid from "../components/inventory/InventoryGrid";
import AddGearDrawer from "../components/inventory/AddGearDrawer";
import StatusStripSkeleton from "../components/layout/StatusStripSkeleton";
import AuthLoadingState from "../components/terminal/AuthLoadingState";

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const inventoryQuery = useEntityQuery(
    ["inventory", user?.email],
    () => user ? base44.entities.InventoryItem.filter({ owner_email: user.email }, "-created_date", 200) : Promise.resolve([]),
    {
      subscribeEntities: ["InventoryItem"],
      queryOpts: { enabled: !!user?.email },
    }
  );
  const { data: items = [], isLoading: loading, syncMeta: inventorySyncMeta } = inventoryQuery;

  useRegisterSync("inventory", inventoryQuery);

  const equipped = items.filter(i => i.is_equipped).length;
  const totalValue = items.reduce((s, i) => s + (i.value || 0) * (i.quantity || 1), 0);
  const lowCondition = items.filter(i => (i.condition ?? 100) < 30).length;

  const statusItems = [
    { label: "TOTAL ITEMS", value: items.length, color: "text-primary" },
    { label: "EQUIPPED", value: equipped, color: "text-accent" },
    { label: "DEGRADED", value: lowCondition, color: lowCondition > 0 ? "text-destructive" : "text-foreground" },
    { label: "VALUE", value: `${totalValue}c`, color: "text-foreground" },
  ];

  if (!user && !inventoryQuery.data) {
    return (
      <PageShell title="Gear Locker" subtitle="Your weapons, armor, and supplies — add gear to start tracking">
        <AuthLoadingState message="LOADING GEAR LOCKER..." />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="Gear Locker" subtitle="Your weapons, armor, and supplies — add gear to start tracking">
        <StatusStripSkeleton count={4} />
        <SkeletonGrid count={6} variant="inventory" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Gear Locker"
      subtitle="Your weapons, armor, and supplies — add gear to start tracking"
      syncMeta={inventorySyncMeta}
      onRetry={() => inventoryQuery.refetch()}
      statusStrip={<StatusStrip items={statusItems} />}
      actions={
        <Button
          variant={showAdd ? "default" : "outline"}
          size="sm"
          className="text-[10px] uppercase tracking-wider h-7 font-mono"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-3 w-3 mr-1" />
          {showAdd ? "CLOSE" : "ADD GEAR"}
        </Button>
      }
    >
      {/* Add gear drawer — progressive disclosure */}
      {showAdd && (
        <AddGearDrawer userEmail={user?.email} onClose={() => setShowAdd(false)} />
      )}

      {/* Main inventory grid */}
      <InventoryGrid items={items} userEmail={user?.email} />

      {/* Continuity cues */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <NextStepBanner
            to="/trade"
            icon={ArrowLeftRight}
            label="Trade surplus gear"
            hint="Post unwanted items on the Trade Hub for other operatives."
            color="muted"
          />
          <NextStepBanner
            to="/workbench"
            icon={Hammer}
            label="Craft something new"
            hint="Use your materials to start a build on the Workbench."
            color="muted"
          />
        </div>
      )}
    </PageShell>
  );
}