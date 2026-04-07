import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Crosshair, Skull, Target, Coins, Award, Calendar, Shield } from "lucide-react";
import moment from "moment";

export default function PlayerDetailDrawer({ player, onClose }) {
  if (!player) return null;

  const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills > 0 ? "∞" : "0.00";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-sm bg-card border-l border-border h-full overflow-y-auto p-5 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold font-display text-primary uppercase tracking-wider">
              {player.callsign || player.name}
            </h2>
            {player.callsign && (
              <p className="text-[10px] text-muted-foreground">{player.name}</p>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{player.email}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {player.isOnline ? (
            <Badge className="text-[10px] bg-status-ok/15 text-status-ok border-status-ok/30">ONLINE</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">OFFLINE</Badge>
          )}
          <Badge variant="outline" className="text-[10px] uppercase">{player.role}</Badge>
        </div>

        {/* Combat stats */}
        <div>
          <h3 className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2 font-mono">COMBAT</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-border rounded-sm p-2.5 text-center">
              <Crosshair className="h-3.5 w-3.5 text-accent mx-auto mb-1" />
              <div className="text-lg font-bold font-display text-accent">{player.kills}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Kills</div>
            </div>
            <div className="border border-border rounded-sm p-2.5 text-center">
              <Skull className="h-3.5 w-3.5 text-destructive mx-auto mb-1" />
              <div className="text-lg font-bold font-display text-destructive">{player.deaths}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Deaths</div>
            </div>
            <div className="border border-border rounded-sm p-2.5 text-center">
              <Target className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold font-display text-primary">{kd}</div>
              <div className="text-[9px] text-muted-foreground uppercase">K/D</div>
            </div>
          </div>
        </div>

        {/* Economy */}
        <div>
          <h3 className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2 font-mono">ECONOMY</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-border rounded-sm p-2.5 text-center">
              <Coins className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold font-display text-primary">{player.credits}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Credits</div>
            </div>
            <div className="border border-border rounded-sm p-2.5 text-center">
              <Target className="h-3.5 w-3.5 text-status-ok mx-auto mb-1" />
              <div className="text-lg font-bold font-display text-status-ok">{player.missionsCompleted}</div>
              <div className="text-[9px] text-muted-foreground uppercase">Missions</div>
            </div>
          </div>
        </div>

        {/* Reputation breakdown */}
        {player.factionReps && player.factionReps.length > 0 && (
          <div>
            <h3 className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2 font-mono">FACTION REPUTATION</h3>
            <div className="space-y-1.5">
              {player.factionReps.map((rep, i) => (
                <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-sm px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-mono text-foreground">{rep.faction_name || rep.faction_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {rep.rank && <Badge variant="outline" className="text-[9px]">{rep.rank}</Badge>}
                    <span className={`text-xs font-bold font-mono ${rep.score >= 0 ? "text-status-ok" : "text-destructive"}`}>
                      {rep.score >= 0 ? "+" : ""}{rep.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {player.recentActivity && player.recentActivity.length > 0 && (
          <div>
            <h3 className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2 font-mono">RECENT ACTIVITY</h3>
            <div className="space-y-1">
              {player.recentActivity.map((log, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground truncate">{log.title}</p>
                    <span className="text-[9px] text-muted-foreground/60">{moment(log.created_date).fromNow()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground/50 pt-2 border-t border-border/30">
          <Calendar className="h-3 w-3" />
          <span>Joined {player.joinedAt ? moment(player.joinedAt).format("MMM D, YYYY") : "Unknown"}</span>
        </div>
      </div>
    </div>
  );
}