import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LiveStream from "./LiveStream";
import CombatLog from "./CombatLog";

const TABS = [
  { key: "live", label: "LIVE FEED", desc: "Real-time stream of world changes — new missions, faction moves, and territory shifts as they happen" },
  { key: "log", label: "COMBAT LOG", desc: "Searchable history of all events, filterable by type. Hover entries for details." },
];

export default function ActivityFeed() {
  const [activeTab, setActiveTab] = useState("live");

  return (
    <div>
      {/* Tab bar */}
      <TooltipProvider delayDuration={300}>
      <div className="flex gap-1 mb-3">
        {TABS.map((tab) => (
          <Tooltip key={tab.key}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                className="h-6 text-[9px] px-3 tracking-widest font-mono"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30 max-w-[220px]">
              <p className="text-muted-foreground">{tab.desc}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      </TooltipProvider>

      {/* Content */}
      {activeTab === "live" ? <LiveStream /> : <CombatLog />}
    </div>
  );
}