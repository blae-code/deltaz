import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Shield, Swords, Handshake, AlertTriangle, MapPin, TrendingUp, Clock } from "lucide-react";
import moment from "moment";

const dipStatusConfig = {
  neutral: { label: "NEUTRAL", color: "text-muted-foreground", bg: "bg-muted/30" },
  allied: { label: "ALLIED", color: "text-status-ok", bg: "bg-status-ok/10" },
  trade_agreement: { label: "TRADE PACT", color: "text-chart-4", bg: "bg-chart-4/10" },
  ceasefire: { label: "CEASEFIRE", color: "text-primary", bg: "bg-primary/10" },
  hostile: { label: "HOSTILE", color: "text-status-warn", bg: "bg-status-warn/10" },
  war: { label: "WAR", color: "text-status-danger", bg: "bg-status-danger/10" },
};

export default function WorldSimulationStatus() {
  const [diplomacy, setDiplomacy] = useState([]);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Diplomacy.list("-updated_date", 50),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Territory.list("-created_date", 100),
    ]).then(([d, f, t]) => {
      setDiplomacy(d);
      setFactions(f);
      setTerritories(t);
      setLoading(false);
    });

    const unsubs = [
      base44.entities.Diplomacy.subscribe((ev) => {
        if (ev.type === "create") setDiplomacy(prev => [ev.data, ...prev]);
        else if (ev.type === "update") setDiplomacy(prev => prev.map(d => d.id === ev.id ? ev.data : d));
      }),
      base44.entities.Territory.subscribe((ev) => {
        if (ev.type === "update") setTerritories(prev => prev.map(t => t.id === ev.id ? ev.data : t));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const getFaction = (id) => factions.find(f => f.id === id);
  const contested = territories.filter(t => t.status === "contested" || t.status === "hostile");
  const criticalThreat = territories.filter(t => t.threat_level === "critical" || t.threat_level === "high");
  const activeConflicts = diplomacy.filter(d => d.status === "hostile" || d.status === "war");
  const activePacts = diplomacy.filter(d => ["allied", "trade_agreement", "ceasefire"].includes(d.status));
  const expiringPacts = activePacts.filter(d => d.expires_at && moment(d.expires_at).diff(moment(), "hours") < 24);

  if (loading) return null;

  return (
    <DataCard title="World Simulation Status" headerRight={
      <div className="flex items-center gap-1 text-[8px] text-status-ok font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-status-ok animate-pulse" />
        SIMULATION ACTIVE
      </div>
    }>
      <div className="space-y-3">
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="border border-border rounded-sm p-2 text-center">
            <Swords className="h-3.5 w-3.5 mx-auto text-status-danger mb-0.5" />
            <p className="text-sm font-bold font-display text-status-danger">{activeConflicts.length}</p>
            <p className="text-[7px] text-muted-foreground uppercase tracking-wider">Conflicts</p>
          </div>
          <div className="border border-border rounded-sm p-2 text-center">
            <Handshake className="h-3.5 w-3.5 mx-auto text-status-ok mb-0.5" />
            <p className="text-sm font-bold font-display text-status-ok">{activePacts.length}</p>
            <p className="text-[7px] text-muted-foreground uppercase tracking-wider">Pacts</p>
          </div>
          <div className="border border-border rounded-sm p-2 text-center">
            <AlertTriangle className="h-3.5 w-3.5 mx-auto text-status-warn mb-0.5" />
            <p className="text-sm font-bold font-display text-status-warn">{contested.length}</p>
            <p className="text-[7px] text-muted-foreground uppercase tracking-wider">Contested</p>
          </div>
          <div className="border border-border rounded-sm p-2 text-center">
            <MapPin className="h-3.5 w-3.5 mx-auto text-status-danger mb-0.5" />
            <p className="text-sm font-bold font-display text-foreground">{criticalThreat.length}</p>
            <p className="text-[7px] text-muted-foreground uppercase tracking-wider">High Threat</p>
          </div>
        </div>

        {/* Active diplomatic relationships */}
        {diplomacy.filter(d => d.status !== "neutral").length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase">Active Relations</span>
            {diplomacy.filter(d => d.status !== "neutral").map(d => {
              const fA = getFaction(d.faction_a_id);
              const fB = getFaction(d.faction_b_id);
              const cfg = dipStatusConfig[d.status] || dipStatusConfig.neutral;
              const isExpiring = d.expires_at && moment(d.expires_at).diff(moment(), "hours") < 24;

              return (
                <div key={d.id} className={`flex items-center justify-between rounded-sm px-2.5 py-1.5 border border-border ${cfg.bg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: fA?.color || "#888" }} />
                    <span className="text-[10px] font-mono text-foreground truncate">{fA?.name || "?"}</span>
                    <span className="text-[9px] text-muted-foreground">↔</span>
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: fB?.color || "#888" }} />
                    <span className="text-[10px] font-mono text-foreground truncate">{fB?.name || "?"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[7px] ${cfg.color} border-current/20`}>{cfg.label}</Badge>
                    {isExpiring && (
                      <Badge variant="outline" className="text-[7px] text-accent border-accent/30">
                        <Clock className="h-2 w-2 mr-0.5" />
                        {moment(d.expires_at).fromNow()}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contested territories */}
        {contested.length > 0 && (
          <div className="space-y-1">
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase">Contested Zones</span>
            <div className="flex flex-wrap gap-1">
              {contested.map(t => {
                const faction = getFaction(t.controlling_faction_id);
                return (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className={`text-[8px] ${t.status === "hostile" ? "text-status-danger border-status-danger/30" : "text-status-warn border-status-warn/30"}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: faction?.color || "#888" }} />
                    {t.name} ({t.sector}) — {t.threat_level}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Expiring agreements warning */}
        {expiringPacts.length > 0 && (
          <div className="border border-accent/30 bg-accent/5 rounded-sm px-2.5 py-2 space-y-1">
            <div className="flex items-center gap-1 text-[9px] text-accent font-semibold uppercase tracking-wider">
              <Clock className="h-3 w-3" /> Expiring Soon
            </div>
            {expiringPacts.map(d => {
              const fA = getFaction(d.faction_a_id);
              const fB = getFaction(d.faction_b_id);
              return (
                <p key={d.id} className="text-[9px] text-muted-foreground">
                  {fA?.name} — {fB?.name} {d.status} expires {moment(d.expires_at).fromNow()}
                </p>
              );
            })}
          </div>
        )}

        <p className="text-[8px] text-muted-foreground/60 italic">
          The world simulation runs automatically every 2 hours — factions compete for territory, form alliances, and plot against each other even when you're offline. Your diplomatic actions and mission completions directly influence outcomes.
        </p>
      </div>
    </DataCard>
  );
}