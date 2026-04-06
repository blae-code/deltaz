import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Radio, Globe, Coins, Server, AlertTriangle, ChevronRight } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import AdminLiveOps from "../components/admin/AdminLiveOps";
import AdminWorldMgmt from "../components/admin/AdminWorldMgmt";
import AdminEconomy from "../components/admin/AdminEconomy";
import AdminServerPanel from "../components/admin/AdminServerPanel";

const SECTIONS = [
  {
    key: "live",
    label: "Live Ops",
    icon: Radio,
    description: "Dispatch, auto-assign, mission forge, sector events",
    risk: "medium",
  },
  {
    key: "world",
    label: "World",
    icon: Globe,
    description: "Territories, clans, diplomacy, broadcasts",
    risk: null,
  },
  {
    key: "economy",
    label: "Economy",
    icon: Coins,
    description: "Resources, trade routes, survivor management",
    risk: null,
  },
  {
    key: "server",
    label: "Server",
    icon: Server,
    description: "Power controls, whitelist, RCON, scheduler",
    risk: "high",
  },
];

export default function Admin() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("live");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageShell title="Command Center" subtitle="Game Master Operations">
        <div className="flex items-center justify-center py-16">
          <div className="text-primary text-xs tracking-widest animate-pulse font-mono">AUTHENTICATING...</div>
        </div>
      </PageShell>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <PageShell title="Command Center" subtitle="Game Master Operations">
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Shield className="w-12 h-12 text-destructive mx-auto" />
            <div className="font-mono text-sm text-destructive">ACCESS DENIED</div>
            <div className="font-mono text-xs text-muted-foreground">
              GM clearance required. Contact your server administrator.
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  const activeSection = SECTIONS.find(s => s.key === section);

  return (
    <PageShell
      title="Command Center"
      subtitle={`Logged in as ${user.full_name || user.email} — Full GM access`}
    >
      {/* Section selector — cleaner command grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`group relative flex flex-col items-start gap-1.5 border rounded-sm px-3 py-3 transition-all text-left ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                <span className="text-[10px] font-mono font-semibold tracking-wider uppercase flex-1">
                  {s.label}
                </span>
                {s.risk === "high" && (
                  <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                )}
                {active && (
                  <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                )}
              </div>
              <span className="text-[8px] text-muted-foreground leading-tight">
                {s.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active section context bar */}
      {activeSection?.risk && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-[9px] font-mono ${
          activeSection.risk === "high"
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "border-accent/30 bg-accent/5 text-accent"
        }`}>
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>
            {activeSection.risk === "high"
              ? "SERVER CONTROL — Actions here directly affect the live server. Use confirmation prompts carefully."
              : "LIVE OPS — Some actions here generate missions, dispatch operatives, or trigger world events."}
          </span>
        </div>
      )}

      {/* Active section content */}
      <div className="mt-1">
        {section === "live" && <AdminLiveOps />}
        {section === "world" && <AdminWorldMgmt />}
        {section === "economy" && <AdminEconomy />}
        {section === "server" && <AdminServerPanel />}
      </div>
    </PageShell>
  );
}