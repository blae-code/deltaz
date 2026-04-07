import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown, Crosshair, Skull, Target, Coins, Award } from "lucide-react";

const COLUMNS = [
  { key: "name", label: "Player", width: "flex-1 min-w-[140px]" },
  { key: "isOnline", label: "Status", width: "w-20" },
  { key: "kills", label: "Kills", width: "w-16" },
  { key: "deaths", label: "Deaths", width: "w-16" },
  { key: "missionsCompleted", label: "Missions", width: "w-20" },
  { key: "credits", label: "Credits", width: "w-20" },
  { key: "totalReputation", label: "Rep", width: "w-16" },
];

function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
}

export default function PlayerTelemetryTable({ players, sortKey, sortDir, onSort, onSelectPlayer }) {
  if (players.length === 0) {
    return (
      <div className="border border-border rounded-sm p-6 text-center">
        <p className="text-xs text-muted-foreground font-mono">No players match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-b border-border">
        {COLUMNS.map(col => (
          <button
            key={col.key}
            onClick={() => onSort(col.key)}
            className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors hover:text-foreground ${
              col.width
            } ${sortKey === col.key ? "text-primary" : "text-muted-foreground"}`}
          >
            {col.label}
            <SortIcon active={sortKey === col.key} dir={sortDir} />
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
        {players.map(player => (
          <button
            key={player.email}
            onClick={() => onSelectPlayer(player)}
            className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-secondary/30 transition-colors"
          >
            {/* Player name */}
            <div className="flex-1 min-w-[140px]">
              <div className="text-xs font-semibold text-foreground truncate">
                {player.callsign || player.name}
              </div>
              {player.callsign && (
                <div className="text-[10px] text-muted-foreground truncate">{player.name}</div>
              )}
            </div>

            {/* Status */}
            <div className="w-20">
              {player.isOnline ? (
                <Badge className="text-[9px] bg-status-ok/15 text-status-ok border-status-ok/30 px-1.5">ONLINE</Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-muted-foreground px-1.5">OFFLINE</Badge>
              )}
            </div>

            {/* Kills */}
            <div className="w-16 text-xs font-mono text-foreground flex items-center gap-1">
              <Crosshair className="h-3 w-3 text-accent shrink-0" /> {player.kills}
            </div>

            {/* Deaths */}
            <div className="w-16 text-xs font-mono text-foreground flex items-center gap-1">
              <Skull className="h-3 w-3 text-destructive shrink-0" /> {player.deaths}
            </div>

            {/* Missions */}
            <div className="w-20 text-xs font-mono text-foreground flex items-center gap-1">
              <Target className="h-3 w-3 text-primary shrink-0" /> {player.missionsCompleted}
            </div>

            {/* Credits */}
            <div className="w-20 text-xs font-mono text-primary flex items-center gap-1">
              <Coins className="h-3 w-3 shrink-0" /> {player.credits}
            </div>

            {/* Rep */}
            <div className="w-16 text-xs font-mono text-accent flex items-center gap-1">
              <Award className="h-3 w-3 shrink-0" /> {player.totalReputation}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}