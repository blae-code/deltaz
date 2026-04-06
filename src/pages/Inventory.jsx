import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeftRight, Plus, Handshake, ScrollText, Camera, List, ChevronDown, ChevronUp } from "lucide-react";
import InventoryGrid from "../components/inventory/InventoryGrid";
import InventoryStats from "../components/inventory/InventoryStats";
import AddItemForm from "../components/inventory/AddItemForm";
import SectorTradeBoard from "../components/inventory/SectorTradeBoard";
import CreateTradeForm from "../components/inventory/CreateTradeForm";
import CreateTradeRequest from "../components/trading/CreateTradeRequest";
import TradeRequestList from "../components/trading/TradeRequestList";
import TradeLedger from "../components/trading/TradeLedger";
import ScreenshotIngestion from "../components/inventory/ScreenshotIngestion";
import BulkAddForm from "../components/inventory/BulkAddForm";
import GuidanceBox from "../components/terminal/GuidanceBox";

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inventory");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showScreenshotScan, setShowScreenshotScan] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showCreateTrade, setShowCreateTrade] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [showStats, setShowStats] = useState(false);

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
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            {tab === "inventory" && "Inventory"}
            {tab === "trade" && "Trade Post"}
            {tab === "deals" && "P2P Deals"}
            {tab === "ledger" && "Trade Ledger"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {tab === "inventory" && "Manage your gear, weapons, and supplies"}
            {tab === "trade" && "Trade resources with nearby operatives"}
            {tab === "deals" && "Send and review direct trade proposals"}
            {tab === "ledger" && "Complete history of all your trades"}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant={tab === "inventory" ? "default" : "outline"} size="sm" className="text-[10px] uppercase tracking-wider h-7" onClick={() => setTab("inventory")}>
            <Package className="h-3 w-3 mr-1" /> GEAR
          </Button>
          <Button variant={tab === "trade" ? "default" : "outline"} size="sm" className="text-[10px] uppercase tracking-wider h-7" onClick={() => setTab("trade")}>
            <ArrowLeftRight className="h-3 w-3 mr-1" /> TRADE
          </Button>
          <Button variant={tab === "deals" ? "default" : "outline"} size="sm" className="text-[10px] uppercase tracking-wider h-7" onClick={() => setTab("deals")}>
            <Handshake className="h-3 w-3 mr-1" /> P2P DEALS
          </Button>
          <Button variant={tab === "ledger" ? "default" : "outline"} size="sm" className="text-[10px] uppercase tracking-wider h-7" onClick={() => setTab("ledger")}>
            <ScrollText className="h-3 w-3 mr-1" /> LEDGER
          </Button>
        </div>
      </div>

      {tab === "inventory" && (
        <>
          {/* Stats — collapsible */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full flex items-center justify-between border border-border rounded-sm px-3 py-2 bg-card hover:bg-secondary/30 transition-colors"
          >
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
              INVENTORY OVERVIEW · {items.length} ITEMS
            </span>
            {showStats ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </button>
          {showStats && <InventoryStats items={items} />}

          <div className="flex items-center justify-end flex-wrap gap-1.5">
            <div className="flex gap-1.5">
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
          </div>

          {showScreenshotScan && (
            <DataCard title="Screenshot Inventory Scan">
              <ScreenshotIngestion userEmail={user?.email} onComplete={() => { loadData(); setShowScreenshotScan(false); }} />
            </DataCard>
          )}

          {showBulkAdd && (
            <DataCard title="Bulk Add Items">
              <BulkAddForm userEmail={user?.email} onComplete={() => { loadData(); setShowBulkAdd(false); }} />
            </DataCard>
          )}

          {showAddItem && (
            <DataCard title="Log New Item">
              <AddItemForm userEmail={user?.email} onAdded={() => { loadData(); setShowAddItem(false); }} />
            </DataCard>
          )}

          <InventoryGrid items={items} onUpdate={loadData} userEmail={user?.email} />
        </>
      )}

      {tab === "trade" && (
        <>
          <GuidanceBox icon={ArrowLeftRight} title="Trade Post" color="muted">
            Post items or resources for other operatives to buy. Set your asking price and wait for takers.
            Browse existing offers below to find what you need.
          </GuidanceBox>
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

      {tab === "deals" && (
        <>
          <GuidanceBox icon={Handshake} title="P2P Deals" color="muted">
            Send private trade proposals directly to another operative. You define what you offer
            and what you want — they have 48 hours to respond.
          </GuidanceBox>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] uppercase tracking-wider h-7"
              onClick={() => setShowCreateDeal(!showCreateDeal)}
            >
              <Plus className="h-3 w-3 mr-1" /> NEW PROPOSAL
            </Button>
          </div>

          {showCreateDeal && (
            <DataCard title="Create Trade Proposal">
              <CreateTradeRequest
                userEmail={user?.email}
                userCallsign={user?.callsign || user?.full_name}
                onCreated={() => setShowCreateDeal(false)}
              />
            </DataCard>
          )}

          <TradeRequestList userEmail={user?.email} />
        </>
      )}

      {tab === "ledger" && (
        <TradeLedger userEmail={user?.email} />
      )}
    </div>
  );
}