import { useState } from "react";
import { ArrowLeftRight, Coins, Users, Brain } from "lucide-react";
import AdminSubSection from "./AdminSubSection";
import TradePanel from "./TradePanel";
import ResourceDashboard from "./ResourceDashboard";
import SurvivorAdminPanel from "./SurvivorAdminPanel";
import SurvivorAIPanel from "./SurvivorAIPanel";
import CatalogOpsPanel from "./CatalogOpsPanel";

const TABS = [
  { key: "economy", label: "Resources", icon: Coins, description: "View and adjust commodity prices, production rates, and economic cycle parameters." },
  { key: "catalog_ops", label: "Catalog Ops", icon: Coins, description: "Manage the canonical HumanitZ catalog snapshot, live syncs, and backfill state." },
  { key: "trade", label: "Trade Routes", icon: ArrowLeftRight, description: "Manage inter-faction trade agreements and route configurations." },
  { key: "survivors", label: "Survivors", icon: Users, description: "Overview of all colony survivors, their assignments, and population health." },
  { key: "survivor_ai", label: "Survivor AI", icon: Brain, description: "AI needs simulation, auto-task assignment, and needs-based drama generation." },
];

export default function AdminEconomy() {
  const [tab, setTab] = useState("economy");

  return (
    <AdminSubSection
      title="Systems & Economy"
      description="Control trade routes, resource production, economic cycles, and survivor populations. Changes affect faction balance."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "economy" && <ResourceDashboard />}
      {tab === "catalog_ops" && <CatalogOpsPanel />}
      {tab === "trade" && <TradePanel />}
      {tab === "survivors" && <SurvivorAdminPanel />}
      {tab === "survivor_ai" && <SurvivorAIPanel />}
    </AdminSubSection>
  );
}
