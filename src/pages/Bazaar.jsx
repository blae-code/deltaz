import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "../hooks/useCurrentUser";
import useEntityQuery from "../hooks/useEntityQuery";
import PageShell from "../components/layout/PageShell";
import DataCard from "../components/terminal/DataCard";
import AuthLoadingState from "../components/terminal/AuthLoadingState";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import BazaarStats from "../components/bazaar/BazaarStats";
import TradeListingCard from "../components/bazaar/TradeListingCard";
import CreateTradeListingForm from "../components/bazaar/CreateTradeListingForm";
import TransactionLog from "../components/bazaar/TransactionLog";
import NpcTradeGenerator from "../components/bazaar/NpcTradeGenerator";
import ResourceAnalysisPanel from "../components/bazaar/ResourceAnalysisPanel";
import ActionRail from "../components/layout/ActionRail";
import { Plus, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { isAdminOrGM } from "../lib/displayName";

export default function Bazaar() {
  const { user, loading: authLoading } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("all");
  const [accepting, setAccepting] = useState(false);
  const [resourceFilter, setResourceFilter] = useState("all");

  const tradesQuery = useEntityQuery(
    "bazaar-trades",
    () => base44.entities.ResourceTrade.list("-created_date", 100),
    { subscribeEntities: ["ResourceTrade"] }
  );
  const { data: trades = [] } = tradesQuery;

  const txQuery = useEntityQuery(
    "bazaar-transactions",
    () => base44.entities.TradeTransaction.list("-created_date", 50),
    { subscribeEntities: ["TradeTransaction"] }
  );
  const { data: transactions = [] } = txQuery;

  const basesQuery = useEntityQuery(
    ["bazaar-bases", user?.email],
    () => user ? base44.entities.PlayerBase.filter({ owner_email: user.email }) : Promise.resolve([]),
    { queryOpts: { enabled: !!user?.email } }
  );
  const { data: userBases = [] } = basesQuery;

  const factionsQuery = useEntityQuery(
    "bazaar-factions",
    () => base44.entities.Faction.list("-created_date", 50),
    { subscribeEntities: ["Faction"] }
  );
  const { data: factions = [] } = factionsQuery;

  if (authLoading) return <AuthLoadingState message="CONNECTING TO RESOURCE BAZAAR..." />;
  if (tradesQuery.isLoading && !tradesQuery.data) {
    return (
      <PageShell title="Resource Bazaar" subtitle="Loading marketplace...">
        <SkeletonGrid count={4} />
      </PageShell>
    );
  }

  const isAdmin = isAdminOrGM(user);

  const tabs = [
    { id: "all", label: "All Listings" },
    { id: "open", label: "Open", count: trades.filter(t => t.status === "open").length },
    { id: "mine", label: "My Listings", count: trades.filter(t => t.seller_email === user?.email).length },
    { id: "log", label: "Transaction Log" },
    { id: "analysis", label: "AI Analysis" },
  ];

  const RESOURCE_FILTERS = ["all", "food", "water", "medical", "power", "defense_parts", "scrap"];

  let filteredTrades = trades;
  if (tab === "open") filteredTrades = trades.filter(t => t.status === "open");
  else if (tab === "mine") filteredTrades = trades.filter(t => t.seller_email === user?.email);
  else if (tab !== "log") filteredTrades = trades;

  if (resourceFilter !== "all" && tab !== "log") {
    filteredTrades = filteredTrades.filter(
      t => t.resource_offered === resourceFilter || t.resource_requested === resourceFilter
    );
  }

  const handleAccept = async (tradeId, buyerBaseId) => {
    setAccepting(true);
    const res = await base44.functions.invoke("executeResourceTrade", {
      trade_id: tradeId,
      buyer_base_id: buyerBaseId,
    });
    if (res.data?.error) {
      toast({ title: "Trade failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: "Trade completed!" });
      tradesQuery.refetch();
      txQuery.refetch();
    }
    setAccepting(false);
  };

  const handleCancel = async (tradeId) => {
    await base44.entities.ResourceTrade.update(tradeId, { status: "cancelled" });
    toast({ title: "Listing cancelled" });
  };

  return (
    <PageShell
      title="Resource Bazaar"
      subtitle="Trade surplus resources between bases and NPC factions"
      syncMeta={tradesQuery.syncMeta}
      onRetry={() => tradesQuery.refetch()}
      actions={
        <div className="flex gap-1.5">
          {isAdmin && (
            <NpcTradeGenerator factions={factions} onGenerated={() => tradesQuery.refetch()} />
          )}
          <Button
            size="sm"
            className="text-[10px] uppercase tracking-wider h-8 gap-1.5"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <ChevronUp className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showForm ? "Hide" : "New Listing"}
          </Button>
        </div>
      }
      statusStrip={<BazaarStats trades={trades} transactions={transactions} />}
      actionRail={<ActionRail tabs={tabs} activeTab={tab} onTabChange={setTab} />}
    >
      {/* Create listing form */}
      {showForm && user && (
        <DataCard title="Post Trade Listing">
          {userBases.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              You need a base before you can trade. Visit the Colony page to establish one.
            </p>
          ) : (
            <CreateTradeListingForm
              userEmail={user.email}
              userBases={userBases}
              onCreated={() => { setShowForm(false); tradesQuery.refetch(); }}
            />
          )}
        </DataCard>
      )}

      {/* Resource filter */}
      {tab !== "log" && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3 w-3 text-muted-foreground" />
          {RESOURCE_FILTERS.map(r => (
            <button
              key={r}
              onClick={() => setResourceFilter(r)}
              className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                resourceFilter === r
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-secondary/30 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {r === "all" ? "All" : r.replace("_", " ")}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tab === "analysis" ? (
        <ResourceAnalysisPanel />
      ) : tab === "log" ? (
        <DataCard title="Transaction History">
          <TransactionLog transactions={transactions} userEmail={user?.email} />
        </DataCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTrades.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-xs text-muted-foreground">No listings match your filters.</p>
            </div>
          ) : (
            filteredTrades.map(trade => (
              <TradeListingCard
                key={trade.id}
                trade={trade}
                userEmail={user?.email}
                userBases={userBases}
                onAccept={handleAccept}
                accepting={accepting}
              />
            ))
          )}
        </div>
      )}
    </PageShell>
  );
}