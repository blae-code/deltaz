import { useState } from "react";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Skull, MapPin, Swords, Package, Radio, Zap } from "lucide-react";
import moment from "moment";

const EVENT_ICONS = {
  combat_kill: Skull,
  combat_raid: Swords,
  territory_capture: MapPin,
  trade_completed: Package,
  airdrop: Package,
  vehicle_destroyed: Zap,
};

export default function OperativeActivityPanel({ opsLogs, players, factions }) {
  const [search, setSearch] = useState("");

  // Build per-player ops stats
  const playerOps = {};
  for (const log of opsLogs) {
    const email = log.player_email;
    if (!email) continue;
    if (!playerOps[email]) {
      playerOps[email] = {
        email,
        callsign: log.player_callsign || "Unknown",
        combat_kills: 0,
        raids: 0,
        captures: 0,
        trades: 0,
        total_events: 0,
        last_active: log.created_date,
        events_by_type: {},
      };
    }
    const p = playerOps[email];
    p.total_events++;
    p.events_by_type[log.event_type] = (p.events_by_type[log.event_type] || 0) + 1;

    if (log.event_type === "combat_kill") p.combat_kills++;
    if (log.event_type === "combat_raid") p.raids++;
    if (log.event_type === "territory_capture") p.captures++;
    if (log.event_type === "trade_completed") p.trades++;

    if (log.created_date > p.last_active) p.last_active = log.created_date;
  }

  // Merge with user callsigns from players map
  for (const p of Object.values(playerOps)) {
    const user = players.find(u => u.email === p.email);
    if (user?.callsign) p.callsign = user.callsign;
  }

  const sorted = Object.values(playerOps)
    .sort((a, b) => b.total_events - a.total_events)
    .filter(p => !search || p.callsign.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <DataCard title="Operative Activity — OpsLog Analysis">
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search operatives..."
            className="h-7 text-xs pl-7 bg-secondary/50"
          />
        </div>

        {sorted.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">No operative activity recorded yet.</p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 text-[8px] text-muted-foreground uppercase tracking-widest px-2 py-1 border-b border-border sticky top-0 bg-card">
              <span className="col-span-3">OPERATIVE</span>
              <span className="col-span-1 text-right">EVENTS</span>
              <span className="col-span-2 text-right">KILLS</span>
              <span className="col-span-1 text-right">RAIDS</span>
              <span className="col-span-2 text-right">CAPTURES</span>
              <span className="col-span-1 text-right">TRADES</span>
              <span className="col-span-2 text-right">LAST SEEN</span>
            </div>

            {sorted.map((p, i) => (
              <div
                key={p.email}
                className={`grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded-sm text-[10px] font-mono ${
                  i < 3 ? "bg-secondary/40" : "hover:bg-secondary/20"
                }`}
              >
                <span className="col-span-3 truncate text-foreground">
                  {i < 3 && <span className="text-accent mr-1">#{i + 1}</span>}
                  {p.callsign}
                </span>
                <span className="col-span-1 text-right font-semibold text-primary">{p.total_events}</span>
                <span className="col-span-2 text-right text-destructive/80">{p.combat_kills}</span>
                <span className="col-span-1 text-right text-accent">{p.raids}</span>
                <span className="col-span-2 text-right text-status-ok">{p.captures}</span>
                <span className="col-span-1 text-right text-muted-foreground">{p.trades}</span>
                <span className="col-span-2 text-right text-muted-foreground text-[9px]">
                  {moment(p.last_active).fromNow()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DataCard>
  );
}