import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Crosshair, MapPin, Shield, Coins } from "lucide-react";

const diffColors = {
  routine: "text-status-ok border-status-ok/30",
  hazardous: "text-status-warn border-status-warn/30",
  critical: "text-chart-5 border-chart-5/30",
  suicide: "text-status-danger border-status-danger/30",
};

export default function MissionDetailPopup({ mission, factionName, onClose }) {
  if (!mission) return null;

  return (
    <div className="border border-primary/30 bg-card rounded-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/30">
        <div className="flex items-center gap-1.5">
          <Crosshair className="h-3 w-3 text-accent" />
          <span className="text-[10px] font-semibold font-display tracking-wider text-primary uppercase">
            Mission Intel
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
      </div>
      <div className="p-3 space-y-2">
        <h4 className="text-xs font-semibold font-mono text-foreground">{mission.title}</h4>
        {mission.description && (
          <p className="text-[10px] text-muted-foreground leading-relaxed">{mission.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[8px] uppercase">{mission.type}</Badge>
          <Badge variant="outline" className={`text-[8px] uppercase ${diffColors[mission.difficulty] || ""}`}>
            {mission.difficulty}
          </Badge>
          {mission.territory?.name && (
            <Badge variant="outline" className="text-[8px]">
              <MapPin className="h-2 w-2 mr-0.5" />{mission.territory.name}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          {factionName && (
            <div className="border border-border rounded-sm p-1.5">
              <div className="text-[8px] text-muted-foreground">FACTION</div>
              <div className="text-[10px] font-mono text-foreground truncate">{factionName}</div>
            </div>
          )}
          {(mission.reward_credits > 0 || mission.reward_reputation > 0) && (
            <div className="border border-border rounded-sm p-1.5">
              <div className="text-[8px] text-muted-foreground">REWARDS</div>
              <div className="text-[10px] font-mono text-accent">
                {mission.reward_credits > 0 && <span>{mission.reward_credits}c</span>}
                {mission.reward_credits > 0 && mission.reward_reputation > 0 && " + "}
                {mission.reward_reputation > 0 && <span>{mission.reward_reputation} rep</span>}
              </div>
            </div>
          )}
        </div>
        {mission.verification_criteria && (
          <div className="text-[9px] text-muted-foreground bg-secondary/30 rounded-sm p-2">
            <span className="text-primary font-semibold">Objective:</span> {mission.verification_criteria}
          </div>
        )}
      </div>
    </div>
  );
}