import { useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import useCurrentUser from "../hooks/useCurrentUser";
import DataCard from "../components/terminal/DataCard";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeftRight, Handshake, ScrollText, Package } from "lucide-react";
import StatusStrip from "../components/layout/StatusStrip";
import NextStepBanner from "../components/terminal/NextStepBanner";
import SectorTradeBoard from "../components/inventory/SectorTradeBoard";
import CreateTradeForm from "../components/inventory/CreateTradeForm";
import CreateTradeRequest from "../components/trading/CreateTradeRequest";
import TradeRequestList from "../components/trading/TradeRequestList";
import TradeLedger from "../components/trading/TradeLedger";
import PageShell from "../components/layout/PageShell";
import ActionRail from "../components/layout/ActionRail";
import AuthLoadingState from "../components/terminal/AuthLoadingState";

export default function TradeHub() {
  const { user, loading: userLoading } = useCurrentUser();
  const [tab, setTab] = useState("trade");
  const [showCreateTrade, setShowCreateTrade] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);

  // Need inventory items for the CreateTradeForm
  const { data: items = [], isLoading: itemsLoading } = useEntityQuery(
    ["inventory", user?.email],
    () => user ? base44.entities.InventoryItem.filter({ owner_email: user.email }, "-created_date", 200) : Promise.resolve([]),
    { subscribeEntities: ["InventoryItem"], queryOpts: { enabled: !!user?.email } }
  );

  if (!user || userLoading) {
    return (
      <PageShell title="Trade Hub" subtitle="Trade resources with other operatives">
        <AuthLoadingState message="CONNECTING TO TRADE NETWORK..." />
      </PageShell>
    );
  }

  const railTabs = [
    { key: "trade", label: "Trade Post", icon: ArrowLeftRight },
    { key: "deals", label: "P2P Deals", icon: Handshake },
    { key: "ledger", label: "Ledger", icon: ScrollText },
  ];

  const tabTitles = {
    trade: "Trade Post",
    deals: "P2P Deals",
    ledger: "Trade Ledger",
  };

  const tabSubtitles = {
    trade: "Post items or resources for other operatives to buy or barter",
    deals: "Send and review direct trade proposals with specific operatives",
    ledger: "Complete history of all your resolved trades",
  };

  const tradeStats = [
    { label: "YOUR ITEMS", value: items.length, color: "text-primary" },
  ];

  return (
    <PageShell
      title={tabTitles[tab]}
      subtitle={tabSubtitles[tab]}
      statusStrip={tab === "trade" ? <StatusStrip items={tradeStats} /> : null}
      actionRail={<ActionRail tabs={railTabs} active={tab} onChange={setTab} />}
    >
      {/* Continuity: if inventory is empty, nudge to Inventory */}
      {items.length === 0 && tab === "trade" && (
        <NextStepBanner
          to="/loadout?tab=gear"
          icon={Package}
          label="Log your gear first"
          hint="Add items to your Gear Locker so you have something to trade."
          color="accent"
        />
      )}

      {tab === "trade" && (
        <>
          <div className="flex justify-end">
            <Button
              variant={showCreateTrade ? "default" : "outline"}
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
                onCreated={() => setShowCreateTrade(false)}
              />
            </DataCard>
          )}

          <SectorTradeBoard userEmail={user?.email} />
        </>
      )}

      {tab === "deals" && (
        <>
          <div className="flex justify-end">
            <Button
              variant={showCreateDeal ? "default" : "outline"}
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