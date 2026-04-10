import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Shield, Crosshair, Coins, ChevronRight } from "lucide-react";
import { getDisplayName, isAdminOrGM } from "../../lib/displayName";
import OperativeBadgeSvg from "../svg/OperativeBadgeSvg";

/**
 * OperativeIdCard — strong in-world identity presentation.
 * Shows callsign, faction alignment, credits, active mission, and top reputation.
 */
export default function OperativeIdCard({ user, factions, reputations, jobs }) {
  if (!user) return null;

  const displayName = getDisplayName(user);
  const isGM = isAdminOrGM(user);
  const activeMission = (jobs || []).find(
    (j) => j.assigned_to === user.email && j.status === "in_progress"
  );

  // Find primary faction — highest reputation score
  const topRep = (reputations || [])
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  const primaryFaction = topRep
    ? (factions || []).find((f) => f.id === topRep.faction_id)
    : null;

  // Top 3 reputations for snapshot
  const topReps = (reputations || [])
    .filter((r) => r.score !== 0)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 3);

  return (
    <div className="panel-frame overflow-hidden">
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent border-b border-primary/20">
        <div className="flex items-center gap-3">
          {/* Avatar / Monogram — SVG Badge */}
          <OperativeBadgeSvg
            size={44}
            initial={displayName[0]?.toUpperCase() || "?"}
            factionColor={primaryFaction?.color || "hsl(32 82% 48%)"}
          />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-display tracking-wider text-foreground uppercase">
                {displayName}
              </span>
              {isGM && (
                <Badge className="text-[8px] bg-accent/20 text-accent border-accent/30 px-1.5 py-0">
                  GM
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {primaryFaction ? (
                <span
                  className="flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: primaryFaction.color }}
                >
                  <Shield className="h-3 w-3" />
                  {primaryFaction.tag} {primaryFaction.name}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">
                  Unaffiliated
                </span>
              )}
              {user.discord_username && (
                <span className="text-[10px] text-muted-foreground">
                  @{user.discord_username}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1 text-sm font-bold text-primary font-mono">
            <Coins className="h-3.5 w-3.5" />
            {(user.credits ?? 0).toLocaleString()}
          </div>
          <span className="text-[9px] text-muted-foreground tracking-wider">CREDITS</span>
        </div>
      </div>

      {/* Body: mission + reputation */}
      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Active Mission */}
        <div>
          <h4 className="text-[9px] text-muted-foreground tracking-widest uppercase mb-1.5 font-mono">
            ACTIVE MISSION
          </h4>
          {activeMission ? (
            <div className="flex items-start gap-2 panel-frame px-2.5 py-2 shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.4)]">
              <Crosshair className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {activeMission.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className="text-[8px] uppercase px-1 py-0"
                  >
                    {activeMission.type}
                  </Badge>
                  <span className="text-[9px] text-accent uppercase">
                    {activeMission.difficulty}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/50 italic py-2">
              No active assignment
            </p>
          )}
        </div>

        {/* Reputation Snapshot */}
        <div>
          <h4 className="text-[9px] text-muted-foreground tracking-widest uppercase mb-1.5 font-mono">
            REPUTATION
          </h4>
          {topReps.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 italic py-2">
              No faction standing yet
            </p>
          ) : (
            <div className="space-y-1.5">
              {topReps.map((rep) => {
                const faction = (factions || []).find(
                  (f) => f.id === rep.faction_id
                );
                const isNeg = rep.score < 0;
                return (
                  <div key={rep.id} className="flex items-center gap-2">
                    <Shield
                      className="h-3 w-3 shrink-0"
                      style={{ color: faction?.color || "hsl(var(--muted-foreground))" }}
                    />
                    <span className="text-[10px] text-foreground truncate flex-1">
                      {faction?.tag || "??"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[8px] uppercase px-1 py-0 ${
                        isNeg
                          ? "text-destructive border-destructive/30"
                          : "text-primary border-primary/30"
                      }`}
                    >
                      {rep.rank}
                    </Badge>
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isNeg ? "text-destructive" : "text-primary"
                      }`}
                    >
                      {isNeg ? "" : "+"}
                      {rep.score}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer link */}
      <Link
        to="/profile"
        className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors border-t border-border/60 py-2 tracking-wider uppercase font-mono hover:bg-primary/3"
      >
        FULL DOSSIER <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}