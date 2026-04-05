import { Badge } from "@/components/ui/badge";
import { Crosshair, MapPin, Shield, Clock, Zap, Coins, Sparkles } from "lucide-react";
import moment from "moment";

const diffColors = {
  routine: "text-primary border-primary/30",
  hazardous: "text-accent border-accent/30",
  critical: "text-status-danger border-status-danger/30",
  suicide: "text-status-danger border-status-danger/30 font-bold",
};

const diffBg = {
  routine: "bg-primary/5",
  hazardous: "bg-accent/5",
  critical: "bg-status-danger/5",
  suicide: "bg-status-danger/10",
};

export default function GeneratedMissionCard({ mission }) {
  return (
    <div className={`border border-border rounded-sm overflow-hidden ${diffBg[mission.difficulty] || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2 bg-secondary/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-accent" />
          <span className="text-[9px] text-accent tracking-widest font-semibold">AI-GENERATED</span>
        </div>
        <Badge variant="outline" className={`text-[8px] uppercase ${diffColors[mission.difficulty] || ""}`}>
          {mission.difficulty}
        </Badge>
      </div>

      <div className="p-3 space-y-3">
        {/* Title + Type */}
        <div>
          <h4 className="text-xs font-semibold text-foreground">{mission.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[9px] uppercase">{mission.type}</Badge>
            {mission.faction_name && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Shield className="h-2.5 w-2.5" /> {mission.faction_name}
              </span>
            )}
            {mission.territory_name && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" /> {mission.territory_name}
              </span>
            )}
          </div>
        </div>

        {/* Briefing */}
        <p className="text-[10px] text-muted-foreground leading-relaxed">{mission.briefing}</p>

        {/* Objective */}
        {mission.objective && (
          <div className="border border-primary/20 bg-primary/5 rounded-sm p-2">
            <span className="text-[8px] text-primary font-semibold tracking-widest block mb-0.5">OBJECTIVE</span>
            <p className="text-[10px] text-foreground">{mission.objective}</p>
          </div>
        )}

        {/* World Context */}
        {mission.world_context && (
          <p className="text-[9px] text-muted-foreground italic">{mission.world_context}</p>
        )}

        {/* Rewards + Expiry */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-primary">
            <Zap className="h-3 w-3" /> +{mission.reward_reputation} REP
          </span>
          {mission.reward_credits > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-accent">
              <Coins className="h-3 w-3" /> +{mission.reward_credits}c
            </span>
          )}
          {mission.reward_description && (
            <span className="text-[9px] text-muted-foreground">{mission.reward_description}</span>
          )}
          {mission.expires_at && (
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground ml-auto">
              <Clock className="h-2.5 w-2.5" /> Expires {moment(mission.expires_at).fromNow()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}