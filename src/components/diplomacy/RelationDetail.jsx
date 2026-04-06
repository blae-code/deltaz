import { Badge } from "@/components/ui/badge";
import { Shield, Swords, Handshake, Minus, Clock } from "lucide-react";
import moment from "moment";
import DiplomaticActionPanel from "./DiplomaticActionPanel";
import DiplomacyHistory from "./DiplomacyHistory";

const statusIcons = {
  allied: Handshake,
  trade_agreement: Handshake,
  ceasefire: Shield,
  non_aggression: Shield,
  neutral: Minus,
  hostile: Swords,
  war: Swords,
};

const statusColors = {
  allied: "text-status-ok",
  trade_agreement: "text-status-info",
  ceasefire: "text-accent",
  non_aggression: "text-primary",
  neutral: "text-muted-foreground",
  hostile: "text-orange-400",
  war: "text-status-danger",
};

export default function RelationDetail({ relation, factionA, factionB, treaties, userFactionIds, factions, onUpdate }) {
  const status = relation?.status || "neutral";
  const Icon = statusIcons[status] || Minus;

  // Active treaties between these two
  const activeTreaties = treaties.filter(t =>
    t.status === "accepted" &&
    ((t.proposer_faction_id === factionA?.id && t.target_faction_id === factionB?.id) ||
     (t.proposer_faction_id === factionB?.id && t.target_faction_id === factionA?.id))
  );

  return (
    <div className="space-y-3">
      {/* Faction pair header */}
      <div className="flex items-center gap-3 justify-center">
        <div className="text-center">
          <div className="h-3 w-3 rounded-full mx-auto" style={{ backgroundColor: factionA?.color }} />
          <span className="text-[10px] font-semibold text-foreground">{factionA?.name}</span>
        </div>
        <Icon className={`h-5 w-5 ${statusColors[status]}`} />
        <div className="text-center">
          <div className="h-3 w-3 rounded-full mx-auto" style={{ backgroundColor: factionB?.color }} />
          <span className="text-[10px] font-semibold text-foreground">{factionB?.name}</span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        <Badge variant="outline" className={`text-[10px] uppercase ${statusColors[status]}`}>
          {status.replace("_", " ")}
        </Badge>
      </div>

      {/* Details */}
      {relation?.terms && (
        <div>
          <p className="text-[9px] text-muted-foreground tracking-wider uppercase mb-0.5">AGREEMENT TERMS</p>
          <p className="text-xs text-foreground">{relation.terms}</p>
        </div>
      )}
      {relation?.previous_status && (
        <p className="text-[9px] text-muted-foreground">
          Previously: <span className="text-foreground">{relation.previous_status.replace("_", " ")}</span>
        </p>
      )}
      {relation?.expires_at && (
        <p className="text-[9px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Expires {moment(relation.expires_at).fromNow()}
        </p>
      )}

      {/* War info */}
      {status === "war" && relation?.war_declared_at && (
        <div className="border border-status-danger/30 bg-status-danger/5 rounded-sm p-2">
          <p className="text-[9px] text-status-danger font-semibold uppercase tracking-wider">⚔ Active War</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Declared {moment(relation.war_declared_at).fromNow()}
          </p>
          {relation.war_reason && (
            <p className="text-[9px] text-foreground mt-0.5">Reason: {relation.war_reason}</p>
          )}
        </div>
      )}

      {/* Active Treaties */}
      {activeTreaties.length > 0 && (
        <div>
          <p className="text-[9px] text-muted-foreground tracking-wider uppercase mb-1">ACTIVE TREATIES ({activeTreaties.length})</p>
          <div className="space-y-1.5">
            {activeTreaties.map(t => (
              <div key={t.id} className="border border-border/50 rounded-sm px-2.5 py-1.5 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-foreground">{t.treaty_type?.replace("_", " ")}</span>
                  <span className="text-[8px] text-muted-foreground">{t.duration_days}d</span>
                </div>
                {t.terms && <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{t.terms}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!relation && (
        <p className="text-[10px] text-muted-foreground text-center py-2">No formal relationship established.</p>
      )}

      {/* Diplomatic Actions */}
      {userFactionIds?.length > 0 && factionA && factionB && (
        <DiplomaticActionPanel
          factionA={factionA}
          factionB={factionB}
          currentStatus={status}
          userFactionIds={userFactionIds}
          onActionComplete={onUpdate}
        />
      )}

      {/* Diplomacy History */}
      {factionA && factionB && (
        <DiplomacyHistory
          factionAId={factionA.id}
          factionBId={factionB.id}
          factions={factions}
        />
      )}
    </div>
  );
}