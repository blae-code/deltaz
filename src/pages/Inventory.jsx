import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeftRight, Plus } from "lucide-react";
import InventoryGrid from "../components/inventory/InventoryGrid";
import InventoryStats from "../components/inventory/InventoryStats";
import AddItemForm from "../components/inventory/AddItemForm";
import SectorTradeBoard from "../components/inventory/SectorTradeBoard";
import CreateTradeForm from "../components/inventory/CreateTradeForm";

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inventory");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCreateTrade, setShowCreateTrade] = useState(false);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const inv = await base44.entities.InventoryItem.filter({ owner_email: u.email }, "-created_date", 200);
    setItems(inv);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.InventoryItem.subscribe((event) => {
      if (event.type === "create" && event.data.owner_email === user?.email) {
        setItems(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setItems(prev => prev.map(i => i.id === event.id ? event.data : i));
      } else if (event.type === "delete") {
        setItems(prev => prev.filter(i => i.id !== event.id));
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">SCANNING INVENTORY...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            {tab === "inventory" ? "Inventory" : "Trade Post"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {tab === "inventory" ? "Manage your gear, weapons, and supplies" : "Trade resources with nearby operatives"}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={tab === "inventory" ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setTab("inventory")}
          >
            <Package className="h-3 w-3 mr-1" /> GEAR
          </Button>
          <Button
            variant={tab === "trade" ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setTab("trade")}
          >
            <ArrowLeftRight className="h-3 w-3 mr-1" /> TRADE
          </Button>
        </div>
      </div>

      {tab === "inventory" && (
        <>
          <InventoryStats items={items} />

          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase">
              {items.length} ITEMS
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] uppercase tracking-wider h-7"
              onClick={() => setShowAddItem(!showAddItem)}
            >
              <Plus className="h-3 w-3 mr-1" /> ADD ITEM
            </Button>
          </div>

          {showAddItem && (
            <DataCard title="Log New Item">
              <AddItemForm userEmail={user?.email} onAdded={() => { loadData(); setShowAddItem(false); }} />
            </DataCard>
          )}

          <InventoryGrid items={items} onUpdate={loadData} />
        </>
      )}

      {tab === "trade" && (
        <>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] uppercase tracking-wider h-7"
              onClick={() => setShowCreateTrade(!showCreateTrade)}
            >
              <Plus className="h-3 w-3 mr-1" /> POST TRADE
            </Button>
          </div>

          {showCreateTrade && (
            <DataCard title="Create Trade Offer">
              <CreateTradeForm
                items={items}
                userEmail={user?.email}
                userCallsign={user?.callsign || user?.full_name}
                onCreated={() => { setShowCreateTrade(false); }}
              />
            </DataCard>
          )}

          <SectorTradeBoard userEmail={user?.email} />
        </>
      )}
    </div>
  );
}