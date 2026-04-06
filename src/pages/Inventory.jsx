import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
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
import PageShell from "../components/layout/PageShell";
import ActionRail from "../components/layout/ActionRail";

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("inventory");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showScreenshotScan, setShowScreenshotScan] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showCreateTrade, setShowCreateTrade] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: items = [], isLoading: loading } = useEntityQuery(
    ["inventory", user?.email],
    () => user ? base44.entities.InventoryItem.filter({ owner_email: user.email }, "-created_date", 200) : Promise.resolve([]),
    {
      subscribeEntities: ["InventoryItem"],
      queryOpts: { enabled: !!user?.email },
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">SCANNING INVENTORY...</div>
      </div>
    );
  }

  const tabTitles = { inventory: "Inventory", trade: "Trade Post", deals: "P2P Deals", ledger: "Trade Ledger" };
  const tabSubtitles = { inventory: "Manage your gear, weapons, and supplies", trade: "Trade resources with nearby operatives", deals: "Send and review direct trade proposals", ledger: "Complete history of all your trades" };

  const railTabs = [
    { key: "inventory", label: "Gear", icon: Package },
    { key: "trade", label: "Trade", icon: ArrowLeftRight },
    { key: "deals", label: "P2P Deals", icon: Handshake },
    { key: "ledger", label: "Ledger", icon: ScrollText },
  ];

  return (
    <PageShell
      title={tabTitles[tab]}
      subtitle={tabSubtitles[tab]}
      actionRail={<ActionRail tabs={railTabs} active={tab} onChange={setTab} />}
    >
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
    </PageShell>
  );
}