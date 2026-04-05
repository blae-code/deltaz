import { useState, useEffect } from "react";
import { Radio, Skull, Users, MapPin, Shield, Activity } from "lucide-react";

const TICKER_ITEMS = [
  "SECTOR C-3: Hostile patrol detected — avoid after dark",
  "TRADE ROUTE ALPHA: Operational — armed escort recommended",
  "COLONY MORALE: Holding steady at 67%",
  "BOUNTY: 500c for intel on \"The Hollow Men\" raider cell",
  "ANOMALY: Unidentified signal source in sector E-1",
  "MEDICAL: Antibiotics critically low — scavenge priority HIGH",
  "FACTION WAR: Iron Covenant vs. Ash Walkers — sector B-4 contested",
  "WARNING: Radiation spike in northern sectors — avoid topside exposure",
];

const STAT_PANELS = [
  { label: "ACTIVE THREATS", value: "7", icon: Skull, color: "text-status-danger" },
  { label: "OPERATIVES ONLINE", value: "—", icon: Users, color: "text-primary" },
  { label: "TERRITORIES HELD", value: "—", icon: MapPin, color: "text-accent" },
  { label: "FACTION TENSIONS", value: "HIGH", icon: Shield, color: "text-status-warn" },
];

export default function WorldStatus({ visible }) {
  const [tickerIdx, setTickerIdx] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setTickerIdx((i) => (i + 1) % TICKER_ITEMS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {STAT_PANELS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="border border-border/60 bg-card/40 rounded-sm p-2.5 flex items-center gap-2.5"
            >
              <Icon className={`h-4 w-4 ${stat.color} shrink-0`} />
              <div>
                <div className={`text-sm font-bold font-display ${stat.color}`}>{stat.value}</div>
                <div className="text-[8px] text-muted-foreground tracking-widest">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* News ticker */}
      <div className="border border-border/40 bg-card/30 rounded-sm px-3 py-2 flex items-center gap-2 min-h-[36px]">
        <Activity className="h-3 w-3 text-accent shrink-0 animate-pulse" />
        <p className="text-[9px] text-muted-foreground font-mono leading-snug transition-all duration-500">
          {TICKER_ITEMS[tickerIdx]}
        </p>
      </div>
    </div>
  );
}