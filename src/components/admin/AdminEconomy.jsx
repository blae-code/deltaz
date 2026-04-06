import { useState } from "react";
import { ArrowLeftRight, Coins, Users } from "lucide-react";
import AdminSectionHeader from "./AdminSectionHeader";
import AdminTabButton from "./AdminTabButton";
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
  const activeTab = TABS.find(t => t.key === tab);

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        title="Systems & Economy"
        description="Control trade routes, resource production, economic cycles, and survivor populations. Changes affect faction balance."
      />

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <AdminTabButton
            key={t.key}
            icon={t.icon}
            label={t.label}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
          />
        ))}
      </div>

      {activeTab && (
        <p className="text-[9px] text-muted-foreground font-mono border-l-2 border-primary/30 pl-2">
          {activeTab.description}
        </p>
      )}

      <div className="border border-border bg-card rounded-sm p-4">
        {tab === "economy" && <ResourceDashboard />}
        {tab === "trade" && <TradePanel />}
        {tab === "survivors" && <SurvivorAdminPanel />}
      </div>
    </div>
  );
}