import MobileSummaryCard from "./MobileSummaryCard";
import MobileKpiRow from "./MobileKpiRow";
import { Shield, Users } from "lucide-react";

export default function MobileFactions({ factions, reputations, users, user, onSelect }) {
  const getFactionMembers = (factionId) => {
    const memberEmails = new Set(
      reputations
        .filter(r => r.faction_id === factionId && ["trusted", "allied", "revered"].includes(r.rank))
        .map(r => r.player_email)
    );
    return users.filter(u => memberEmails.has(u.email));
  };

  const myRep = (factionId) => {
    const rep = reputations.find(r => r.faction_id === factionId && r.player_email === user?.email);
    return rep?.rank || "unknown";
  };

  const RANK_COLOR = {
    revered: "text-primary",
    allied: "text-status-ok",
    trusted: "text-status-ok",
    neutral: "text-muted-foreground",
    unfriendly: "text-status-warn",
    hostile: "text-destructive",
    unknown: "text-muted-foreground/50",
  };

  const kpis = [
    { label: "FACTIONS", value: factions.length, color: "text-primary" },
    { label: "TOTAL MEMBERS", value: users.length, color: "text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <MobileKpiRow items={kpis} />

      {factions.length === 0 ? (
        <div className="text-center py-8 text-[10px] text-muted-foreground/50 font-mono">
          NO CLANS REGISTERED
        </div>
      ) : (
        <div className="space-y-1.5">
          {factions.map(f => {
            const members = getFactionMembers(f.id);
            const rank = myRep(f.id);
            return (
              <MobileSummaryCard
                key={f.id}
                icon={<Shield className="h-4 w-4" />}
                title={f.name}
                subtitle={f.tag ? `[${f.tag}] · ${f.description?.slice(0, 40) || ""}` : f.description?.slice(0, 50) || ""}
                onClick={() => onSelect(f.id)}
                status={rank.toUpperCase()}
                statusColor={RANK_COLOR[rank]}
              >
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {members.length} members
                  </span>
                </div>
              </MobileSummaryCard>
            );
          })}
        </div>
      )}
    </div>
  );
}