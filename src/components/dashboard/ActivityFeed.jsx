import { useState } from "react";
import { Button } from "@/components/ui/button";
import LiveStream from "./LiveStream";
import CombatLog from "./CombatLog";

const TABS = [
  { key: "live", label: "LIVE FEED" },
  { key: "log", label: "COMBAT LOG" },
];

export default function ActivityFeed() {
  const [activeTab, setActiveTab] = useState("live");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-3">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            size="sm"
            className="h-6 text-[9px] px-3 tracking-widest font-mono"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "live" ? <LiveStream /> : <CombatLog />}
    </div>
  );
}