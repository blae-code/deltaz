import { useState } from "react";
import { ArrowLeftRight, Coins, Users } from "lucide-react";
import AdminSubSection from "./AdminSubSection";
import TradePanel from "./TradePanel";
import ResourceDashboard from "./ResourceDashboard";
import SurvivorAdminPanel from "./SurvivorAdminPanel";

const TABS = [
  { key: "economy", label: "Resources", icon: Coins, description: "View and adjust commodity prices, production rates, and economic cycle parameters." },
  { key: "trade", label: "Trade Routes", icon: ArrowLeftRight, description: "Manage inter-faction trade agreements and route configurations." },
  { key: "survivors", label: "Survivors", icon: Users, description: "Overview of all colony survivors, their assignments, and population health." },
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
      {tab === "trade" && <TradePanel />}
      {tab === "survivors" && <SurvivorAdminPanel />}
    </AdminSubSection>
  );
}