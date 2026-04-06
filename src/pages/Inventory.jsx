import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import DataCard from "../components/terminal/DataCard";
import { Button } from "@/components/ui/button";
import { Plus, Camera, List, ChevronDown, ChevronUp } from "lucide-react";
import InventoryGrid from "../components/inventory/InventoryGrid";
import InventoryStats from "../components/inventory/InventoryStats";
import AddItemForm from "../components/inventory/AddItemForm";
import ScreenshotIngestion from "../components/inventory/ScreenshotIngestion";
import BulkAddForm from "../components/inventory/BulkAddForm";
import PageShell from "../components/layout/PageShell";
import SkeletonGrid from "../components/terminal/SkeletonGrid";

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showScreenshotScan, setShowScreenshotScan] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showStats, setShowStats] = useState(false);

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
    >
      {/* Stats — collapsible */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="w-full flex items-center justify-between border border-border rounded-sm px-3 py-2 bg-card hover:bg-secondary/30 transition-colors"
      >
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
          INVENTORY OVERVIEW · {items.length} ITEMS
        </span>
        {showStats ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>
      {showStats && <InventoryStats items={items} />}

      {/* Add tools */}
      <div className="flex items-center justify-end flex-wrap gap-1.5">
        <Button
          variant={showScreenshotScan ? "default" : "outline"}
          size="sm"
          className="text-[10px] uppercase tracking-wider h-7"
          onClick={() => { setShowScreenshotScan(!showScreenshotScan); setShowBulkAdd(false); setShowAddItem(false); }}
        >
          <Camera className="h-3 w-3 mr-1" /> SCAN
        </Button>
        <Button
          variant={showBulkAdd ? "default" : "outline"}
          size="sm"
          className="text-[10px] uppercase tracking-wider h-7"
          onClick={() => { setShowBulkAdd(!showBulkAdd); setShowScreenshotScan(false); setShowAddItem(false); }}
        >
          <List className="h-3 w-3 mr-1" /> BULK ADD
        </Button>
        <Button
          variant={showAddItem ? "default" : "outline"}
          size="sm"
          className="text-[10px] uppercase tracking-wider h-7"
          onClick={() => { setShowAddItem(!showAddItem); setShowScreenshotScan(false); setShowBulkAdd(false); }}
        >
          <Plus className="h-3 w-3 mr-1" /> ADD ITEM
        </Button>
      </div>

      {showScreenshotScan && (
        <DataCard title="Screenshot Inventory Scan">
          <ScreenshotIngestion userEmail={user?.email} onComplete={() => setShowScreenshotScan(false)} />
        </DataCard>
      )}

      {showBulkAdd && (
        <DataCard title="Bulk Add Items">
          <BulkAddForm userEmail={user?.email} onComplete={() => setShowBulkAdd(false)} />
        </DataCard>
      )}

      {showAddItem && (
        <DataCard title="Log New Item">
          <AddItemForm userEmail={user?.email} onAdded={() => setShowAddItem(false)} />
        </DataCard>
      )}

      <InventoryGrid items={items} userEmail={user?.email} />
    </PageShell>
  );
}