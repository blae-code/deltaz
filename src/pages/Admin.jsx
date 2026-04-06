import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Radio, Globe, Coins, Server } from "lucide-react";
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-3" />
          <div className="font-mono text-sm text-destructive">ACCESS DENIED</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">COMMAND CLEARANCE REQUIRED</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-mono font-bold text-primary terminal-glow tracking-widest">COMMAND CENTER</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">GAME MASTER OPERATIONS</p>
      </div>

      {/* Section selector — big clear buttons */}
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
    </div>
  );
}