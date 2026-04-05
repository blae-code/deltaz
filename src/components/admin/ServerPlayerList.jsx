import { Button } from "@/components/ui/button";
import { RefreshCw, Users, UserCheck } from "lucide-react";

function parsePlayers(raw) {
  if (!raw || typeof raw !== "string") return [];
  // Typical RCON Players response is lines with player info
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  // Try to parse structured player data
  const players = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase().includes("players on server") || trimmed.toLowerCase().startsWith("id")) continue;
    players.push(trimmed);
  }
  return players;
}

export default function ServerPlayerList({ raw, loading, onRefresh }) {
  const players = parsePlayers(raw);
  const hasPlayers = players.length > 0;

  return (
    <div className="border border-border bg-card rounded-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
            CONNECTED PLAYERS
          </h3>
          <span className="text-xs font-bold font-mono text-primary">
            ({players.length})
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {raw === null && !loading && (
        <p className="text-[10px] text-muted-foreground font-mono">
          RCON unavailable — server may be offline.
        </p>
      )}

      {!hasPlayers && raw !== null && (
        <p className="text-[10px] text-muted-foreground font-mono">
          No players currently connected.
        </p>
      )}

      {hasPlayers && (
        <div className="space-y-1.5 max-h-48 overflow-auto">
          {players.map((player, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-secondary/50 rounded-sm px-3 py-1.5"
            >
              <UserCheck className="h-3 w-3 text-primary shrink-0" />
              <span className="text-xs font-mono text-foreground truncate">
                {player}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}