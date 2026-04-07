import { useState } from "react";
import { Server, ShieldCheck, CalendarClock, Radio } from "lucide-react";
import AdminSubSection from "./AdminSubSection";
import ServerDashboard from "./ServerDashboard";
import WhitelistPanel from "./WhitelistPanel";
import SchedulerPanel from "./SchedulerPanel";
import PlayerTelemetryPanel from "./PlayerTelemetryPanel";
import useCurrentUser from "../../hooks/useCurrentUser";

const TABS = [
  { key: "server", label: "Server", icon: Server, risk: "high", description: "Live server status, power controls, and RCON command execution. Actions affect all connected players." },
  { key: "telemetry", label: "Telemetry", icon: Radio, description: "Live player telemetry — stats, activity, online status, and reputation data across all operatives." },
  { key: "whitelist", label: "Whitelist", icon: ShieldCheck, description: "Manage player access to the game server." },
  { key: "scheduler", label: "Scheduler", icon: CalendarClock, description: "Configure automated tasks like restarts, broadcasts, and maintenance windows." },
];

export default function AdminServerPanel() {
  const { user } = useCurrentUser();
  const [tab, setTab] = useState("server");

  return (
    <AdminSubSection
      icon={Server}
      title="Server & Infrastructure"
      description="Direct control over the game server. Power, access, and scheduling operations. Handle with care."
      riskLevel="high"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "server" && <ServerDashboard />}
      {tab === "telemetry" && <PlayerTelemetryPanel />}
      {tab === "whitelist" && <WhitelistPanel />}
      {tab === "scheduler" && <SchedulerPanel userEmail={user?.email} />}
    </AdminSubSection>
  );
}