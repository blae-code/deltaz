import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ActionRail from "../components/layout/ActionRail";
import { Package, Hammer } from "lucide-react";

import Inventory from "./Inventory";
import CraftingTracker from "./CraftingTracker";

const TABS = [
  { key: "gear", label: "Gear Locker", icon: Package },
  { key: "workbench", label: "Workbench", icon: Hammer },
];

export default function Loadout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "gear";

  const setTab = (t) => setSearchParams({ tab: t }, { replace: true });

  return (
    <div className="space-y-4">
      <ActionRail tabs={TABS} active={tab} onChange={setTab} />
      {tab === "gear" && <Inventory />}
      {tab === "workbench" && <CraftingTracker />}
    </div>
  );
}