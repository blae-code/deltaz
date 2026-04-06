import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import QuickStats from "../components/inventory/QuickStats";
import InventoryGrid from "../components/inventory/InventoryGrid";
import AddGearDrawer from "../components/inventory/AddGearDrawer";

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

  if (loading) {
    return (
      <PageShell title="Gear Locker" subtitle="Manage your weapons, armor, and supplies">
        <SkeletonGrid count={6} variant="inventory" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Gear Locker"
      subtitle="Manage your weapons, armor, and supplies"
      syncMeta={inventorySyncMeta}
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
      {/* Inline stats */}
      <QuickStats items={items} />

      {/* Add gear drawer — progressive disclosure */}
      {showAdd && (
        <AddGearDrawer userEmail={user?.email} onClose={() => setShowAdd(false)} />
      )}

      {/* Main inventory grid */}
      <InventoryGrid items={items} userEmail={user?.email} />
    </PageShell>
  );
}