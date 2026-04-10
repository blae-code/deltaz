import { useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../hooks/useEntityQuery";
import useCurrentUser from "../hooks/useCurrentUser";
import DataCard from "../components/terminal/DataCard";
import TerminalLoader from "../components/terminal/TerminalLoader";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeftRight, Handshake, ScrollText } from "lucide-react";
import StatusStrip from "../components/layout/StatusStrip";
import SectorTradeBoard from "../components/inventory/SectorTradeBoard";
import CreateTradeForm from "../components/inventory/CreateTradeForm";
import CreateTradeRequest from "../components/trading/CreateTradeRequest";
import TradeRequestList from "../components/trading/TradeRequestList";
import TradeLedger from "../components/trading/TradeLedger";
import PageShell from "../components/layout/PageShell";
import ActionRail from "../components/layout/ActionRail";

export default function TradeHub() {
  const { user, loading: userLoading } = useCurrentUser();
  const [tab, setTab] = useState("trade");
  const [showCreateTrade, setShowCreateTrade] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [prefillDeal, setPrefillDeal] = useState(null);

  // User's inventory — drives the gear picker and the "YOU HAVE THIS" badge
  const { data: items = [] } = useEntityQuery(
    ["inventory", user?.email],
    () => user ? base44.entities.InventoryItem.filter({ owner_email: user.email }, "-created_date", 200) : Promise.resolve([]),
    { subscribeEntities: ["InventoryItem"], queryOpts: { enabled: !!user?.email } }
  );

  // User's open trade offers — for the "Listed" stat
  const { data: myOpenOffers = [] } = useEntityQuery(
    ["my-open-offers", user?.email],
    () => user ? base44.entities.TradeOffer.filter({ seller_email: user.email, status: "open" }, "-created_date", 50) : Promise.resolve([]),
    { subscribeEntities: ["TradeOffer"], queryOpts: { enabled: !!user?.email } }
  );

  // Called from a Trade Post card — switches to Deals tab pre-filled for that listing
  const handleProposeDeal = (trade) => {
    const isWant = trade.listing_type === "want";
    setPrefillDeal({
      receiverEmail: trade.seller_email,
      receiverCallsign: trade.seller_callsign,
      offeredItems: trade.requested_items || [],
      requestedItems: trade.offered_items || [],
      offeredCredits: isWant ? 0 : (trade.requested_credits || 0),
      requestedCredits: isWant ? (trade.offered_credits || 0) : 0,
    });
    setTab("deals");
    setShowCreateDeal(true);
  };

  if (!user || userLoading) {
    return (
      <PageShell title="Trade Hub" subtitle="Trade resources with other operatives">
        <TerminalLoader size="lg" messages={["CONNECTING TO TRADE NETWORK...", "LOADING YOUR INVENTORY...", "SYNCING LISTINGS..."]} />
      </PageShell>
    );
  }

  const railTabs = [
    { key: "trade", label: "Trade Post",  icon: ArrowLeftRight },
    { key: "deals", label: "P2P Deals",  icon: Handshake },
    { key: "ledger", label: "Ledger",     icon: ScrollText },
  ];

  const tabTitles = {
    trade:  "Trade Post",
    deals:  "P2P Deals",
    ledger: "Trade Ledger",
  };

  const tabSubtitles = {
    trade:  "Post surplus items or broadcast what you need",
    deals:  "Send and review direct trade proposals",
    ledger: "Complete history of all your resolved trades",
  };

  const tradeStats = [
    { label: "INVENTORY",  value: items.length,          color: "text-primary" },
    { label: "LISTED",     value: myOpenOffers.length,   color: myOpenOffers.length > 0 ? "text-accent" : "text-muted-foreground" },
    { label: "AVAILABLE",  value: items.length - myOpenOffers.length, color: "text-foreground" },
  ];

  return (
    <PageShell
      title={tabTitles[tab]}
      subtitle={tabSubtitles[tab]}
      statusStrip={tab === "trade" ? <StatusStrip items={tradeStats} /> : null}
      actionRail={<ActionRail tabs={railTabs} active={tab} onChange={setTab} />}
    >
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
            <DataCard title="Create Listing">
              <CreateTradeForm
                items={items}
                userEmail={user?.email}
                userCallsign={user?.callsign || user?.full_name}
                onCreated={() => setShowCreateTrade(false)}
              />
            </DataCard>
          )}

          <SectorTradeBoard
            userEmail={user?.email}
            userInventory={items}
            userCredits={user?.credits || 0}
            onProposeDeal={handleProposeDeal}
          />
        </>
      )}

      {tab === "deals" && (
        <>
          <div className="flex justify-end">
            <Button
              variant={showCreateDeal ? "default" : "outline"}
              size="sm"
              className="text-[10px] uppercase tracking-wider h-7"
              onClick={() => {
                setShowCreateDeal(!showCreateDeal);
                if (showCreateDeal) setPrefillDeal(null);
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> NEW PROPOSAL
            </Button>
          </div>

          {showCreateDeal && (
            <DataCard title={prefillDeal ? "Trade Proposal — Pre-filled from Listing" : "Create Trade Proposal"}>
              <CreateTradeRequest
                userEmail={user?.email}
                userCallsign={user?.callsign || user?.full_name}
                items={items}
                prefill={prefillDeal}
                onCreated={() => { setShowCreateDeal(false); setPrefillDeal(null); }}
              />
            </DataCard>
          )}

          <TradeRequestList userEmail={user?.email} userInventory={items} userCredits={user?.credits || 0} />
        </>
      )}

      {tab === "ledger" && (
        <TradeLedger userEmail={user?.email} />
      )}
    </PageShell>
  );
}
