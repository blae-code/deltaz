import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Radio, Globe, Coins, Server } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import AdminLiveOps from "../components/admin/AdminLiveOps";
import AdminWorldMgmt from "../components/admin/AdminWorldMgmt";
import AdminEconomy from "../components/admin/AdminEconomy";
import AdminServerPanel from "../components/admin/AdminServerPanel";

const SECTIONS = [
  { key: "live", label: "Live Ops", icon: Radio, description: "Dispatch, auto-assign, forge missions" },
  { key: "world", label: "World", icon: Globe, description: "Territories, factions, diplomacy" },
  { key: "economy", label: "Economy", icon: Coins, description: "Trade, resources, survivors" },
  { key: "server", label: "Server", icon: Server, description: "Status, whitelist, RCON" },
];

export default function Admin() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("live");

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  if (user && user.role !== "admin") {
    return (
      <PageShell title="Command Center" subtitle="Game Master Operations">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Shield className="w-12 h-12 text-destructive mx-auto mb-3" />
            <div className="font-mono text-sm text-destructive">ACCESS DENIED</div>
            <div className="font-mono text-xs text-muted-foreground mt-1">COMMAND CLEARANCE REQUIRED</div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Command Center"
      subtitle="Dispatch missions, manage the world, tune the economy, and control the server"
    >
      {/* Section selector — primary control strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex flex-col items-center gap-1.5 border rounded-sm px-3 py-3 transition-colors text-center ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span className="text-[11px] font-mono font-semibold tracking-wider uppercase">{s.label}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{s.description}</span>
            </button>
          );
        })}
      </div>

      {/* Active section */}
      {section === "live" && <AdminLiveOps />}
      {section === "world" && <AdminWorldMgmt />}
      {section === "economy" && <AdminEconomy />}
      {section === "server" && <AdminServerPanel />}
    </PageShell>
  );
}