import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataCard from "../terminal/DataCard";
import FactionMemberList from "./FactionMemberList";
import { Shield, X } from "lucide-react";

const rankBadgeColor = {
  unknown: "border-border text-muted-foreground",
  neutral: "border-border text-muted-foreground",
  trusted: "border-primary/40 text-primary",
  allied:  "border-primary/60 text-primary",
  revered: "border-accent/60 text-accent",
  hostile: "border-status-danger/40 text-status-danger",
  enemy:   "border-status-danger/60 text-status-danger",
};

export default function FactionDetailPanel({ faction, members = [], reputations = [], userEmail, onClose }) {
  if (!faction) return null;

  const myRep = reputations.find(r => r.faction_id === faction.id && r.player_email === userEmail);
  const rank = myRep?.rank || "unknown";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="panel-frame p-4">
        <div className="flex items-start gap-3">
          <div
            className="h-12 w-12 border flex items-center justify-center shrink-0"
            style={{
              borderColor: faction.color || "hsl(var(--border))",
              backgroundColor: (faction.color || "transparent") + "20",
            }}
          >
            <Shield className="h-6 w-6" style={{ color: faction.color || "hsl(var(--primary))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold font-display tracking-wider" style={{ color: faction.color || undefined }}>
                  {faction.name}
                  {faction.tag && <span className="text-muted-foreground text-xs ml-2">[{faction.tag}]</span>}
                </h3>
                <Badge variant="outline" className="text-[9px] uppercase mt-0.5">{faction.status}</Badge>
              </div>
              {onClose && (
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {faction.description && (
              <p className="text-xs text-muted-foreground mt-2">{faction.description}</p>
            )}
          </div>
        </div>

        {/* My standing */}
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">Your Standing:</span>
          <Badge
            variant="outline"
            className={`text-[10px] uppercase ${rankBadgeColor[rank] || rankBadgeColor.unknown}`}
          >
            {rank}
          </Badge>
          {myRep?.score != null && (
            <span className="text-[10px] text-primary font-mono ml-1">{myRep.score} pts</span>
          )}
        </div>
      </div>

      {/* Member list */}
      <DataCard title="Members" subtitle={`${members.length} registered operative${members.length !== 1 ? "s" : ""}`}>
        <FactionMemberList members={members} />
      </DataCard>
    </div>
  );
}
