import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Server, ShieldCheck, CalendarClock, AlertTriangle } from "lucide-react";
import AdminSectionHeader from "./AdminSectionHeader";
import AdminTabButton from "./AdminTabButton";
import ServerDashboard from "./ServerDashboard";
import WhitelistPanel from "./WhitelistPanel";
import SchedulerPanel from "./SchedulerPanel";

const TABS = [
  { key: "server", label: "Server", icon: Server, risk: "high", description: "Live server status, power controls, and RCON command execution. Actions affect all connected players." },
  { key: "whitelist", label: "Whitelist", icon: ShieldCheck, description: "Manage player access to the game server." },
  { key: "scheduler", label: "Scheduler", icon: CalendarClock, description: "Configure automated tasks like restarts, broadcasts, and maintenance windows." },
];

export default function AdminServerPanel() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("server");
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const activeTab = TABS.find(t => t.key === tab);

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        icon={Server}
        title="Server & Infrastructure"
        description="Direct control over the game server. Power, access, and scheduling operations. Handle with care."
        riskLevel="high"
      />

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

      {activeTab && (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-sm border text-[9px] font-mono ${
          activeTab.risk === "high"
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "border-border bg-secondary/30 text-muted-foreground"
        }`}>
          {activeTab.risk === "high" && <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />}
          <span>{activeTab.description}</span>
        </div>
      )}

      <div className="border border-border bg-card rounded-sm p-4">
        {tab === "server" && <ServerDashboard />}
        {tab === "whitelist" && <WhitelistPanel />}
        {tab === "scheduler" && <SchedulerPanel userEmail={user?.email} />}
      </div>
    </div>
  );
}