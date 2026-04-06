import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Search, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataCard from "../terminal/DataCard";
import ScavengeDeployPanel from "../scavenge/ScavengeDeployPanel";
import ScavengeHistory from "../scavenge/ScavengeHistory";
import MissionGenerator from "../missions/MissionGenerator";
import MissionStats from "../missions/MissionStats";

const TOOLS = [
  { key: "generate", label: "Generate Mission", icon: Sparkles, desc: "AI-create a new mission" },
  { key: "scavenge", label: "Deploy Scout", icon: Search, desc: "Send a scout to a sector" },
  { key: "stats", label: "Mission Stats", icon: BarChart3, desc: "Performance breakdown" },
];

export default function MissionToolsDrawer({ jobs, userEmail, territories, factions, scavengeKey, onDeployed, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(null);

  // Only GMs should see the tools drawer
  if (!isAdmin) return null;

  const handleToolClick = (key) => {
    if (activeTool === key) {
      setActiveTool(null);
    } else {
      setActiveTool(key);
      setOpen(true);
    }
  };

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-card">
      {/* Toggle bar */}
      <button
        onClick={() => { setOpen(!open); if (open) setActiveTool(null); }}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 transition-colors"
      >
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
          GM TOOLS
        </span>
        {open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border">
          {/* Tool selector */}
          <div className="flex gap-1 p-2">
            {TOOLS.map(t => (
              <Button
                key={t.key}
                variant={activeTool === t.key ? "default" : "outline"}
                size="sm"
                className="text-[10px] uppercase tracking-wider h-7 flex-1"
                onClick={() => handleToolClick(t.key)}
              >
                <t.icon className="h-3 w-3 mr-1" />
                {t.label}
              </Button>
            ))}
          </div>

          {/* Tool content */}
          {activeTool === "generate" && (
            <div className="px-3 pb-3">
              <MissionGenerator />
            </div>
          )}

          {activeTool === "scavenge" && (
            <div className="px-3 pb-3 grid md:grid-cols-2 gap-3">
              <DataCard title="Deploy Scout">
                <ScavengeDeployPanel
                  territories={territories || []}
                  factions={factions || []}
                  onDeployed={onDeployed}
                />
              </DataCard>
              <DataCard title="Recent Scavenge Runs">
                <ScavengeHistory key={scavengeKey} userEmail={userEmail} />
              </DataCard>
            </div>
          )}

          {activeTool === "stats" && (
            <div className="px-3 pb-3">
              <MissionStats jobs={jobs} userEmail={userEmail} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}