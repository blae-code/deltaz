import { useState } from "react";
import { Send, Zap, Crosshair, Cloud } from "lucide-react";
import AdminSectionHeader from "./AdminSectionHeader";
import AdminTabButton from "./AdminTabButton";
import DispatchPanel from "./DispatchPanel";
import AutoAssignPanel from "./AutoAssignPanel";
import MissionForgePanel from "./MissionForgePanel";
import SectorEventAdmin from "./SectorEventAdmin";

const TABS = [
  { key: "dispatch", label: "Dispatch", icon: Send, description: "Send a specific operative on a mission." },
  { key: "autoassign", label: "Auto-Assign", icon: Zap, description: "Automatically match available operatives to open missions.", risk: "medium" },
  { key: "forge", label: "Mission Forge", icon: Crosshair, description: "Generate new missions using the AI war engine." },
  { key: "sector_events", label: "Sector Events", icon: Cloud, description: "Trigger world events in specific sectors.", risk: "medium" },
];

export default function AdminLiveOps() {
  const [tab, setTab] = useState("dispatch");
  const activeTab = TABS.find(t => t.key === tab);

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        icon={null}
        title="Live Operations"
        description="Dispatch operatives, generate missions, and trigger world events. Actions here affect the active game state."
      />

      {/* Sub-tab navigation */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <AdminTabButton
            key={t.key}
            icon={t.icon}
            label={t.label}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
            risk={t.risk}
          />
        ))}
      </div>

      {/* Active tab description */}
      {activeTab && (
        <p className="text-[9px] text-muted-foreground font-mono border-l-2 border-primary/30 pl-2">
          {activeTab.description}
        </p>
      )}

      {/* Tab content */}
      <div className="border border-border bg-card rounded-sm p-4">
        {tab === "dispatch" && <DispatchPanel />}
        {tab === "autoassign" && <AutoAssignPanel />}
        {tab === "forge" && <MissionForgePanel />}
        {tab === "sector_events" && <SectorEventAdmin />}
      </div>
    </div>
  );
}