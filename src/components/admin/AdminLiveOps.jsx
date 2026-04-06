import { useState } from "react";
import { Send, Zap, Crosshair, Cloud } from "lucide-react";
import AdminSubSection from "./AdminSubSection";
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

  return (
    <AdminSubSection
      title="Live Operations"
      description="Dispatch operatives, generate missions, and trigger world events. Actions here affect the active game state."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "dispatch" && <DispatchPanel />}
      {tab === "autoassign" && <AutoAssignPanel />}
      {tab === "forge" && <MissionForgePanel />}
      {tab === "sector_events" && <SectorEventAdmin />}
    </AdminSubSection>
  );
}