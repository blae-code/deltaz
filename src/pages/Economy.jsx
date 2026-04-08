import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ActionRail from "../components/layout/ActionRail";
import { Store, ArrowLeftRight, TrendingUp } from "lucide-react";

import Bazaar from "./Bazaar";
import TradeHub from "./TradeHub";
import Market from "./Market";

const TABS = [
  { key: "bazaar", label: "Bazaar", icon: Store },
  { key: "trade", label: "Trade Hub", icon: ArrowLeftRight },
  { key: "market", label: "Market", icon: TrendingUp },
];

export default function Economy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "bazaar";

  const setTab = (t) => setSearchParams({ tab: t }, { replace: true });

  return (
    <div className="space-y-4">
      <ActionRail tabs={TABS} active={tab} onChange={setTab} />
      {tab === "bazaar" && <Bazaar />}
      {tab === "trade" && <TradeHub />}
      {tab === "market" && <Market />}
    </div>
  );
}