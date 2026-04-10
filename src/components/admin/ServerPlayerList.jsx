import { Button } from "@/components/ui/button";
import { RefreshCw, Users, UserCheck } from "lucide-react";

export default function ServerPlayerList({ players = [], raw, loading, onRefresh }) {
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
          {hasPlayers && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-ok opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-ok"></span>
            </span>
          )}
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
              key={player.steam_id || player.name || i}
              className="flex items-center gap-2 bg-secondary/50 rounded-sm px-3 py-1.5"
            >
              <UserCheck className="h-3 w-3 text-primary shrink-0" />
              <span className="text-xs font-mono text-foreground truncate">
                {player.display || player.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
