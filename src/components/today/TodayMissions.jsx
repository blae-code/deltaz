import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Award, ChevronRight, Coins, Target } from "lucide-react";
import CrosshairTargetSvg from "../svg/CrosshairTargetSvg";
import NextStepBanner from "../terminal/NextStepBanner";
import moment from "moment";
import EmptyState from "../terminal/EmptyState";

const diffColor = {
  routine: "text-primary",
  hazardous: "text-accent",
  critical: "text-destructive",
  suicide: "text-destructive font-bold",
};

export default function TodayMissions({ jobs, userEmail }) {
  const myActive = jobs.filter(j => j.assigned_to === userEmail && j.status === "in_progress");
  const available = jobs.filter(j => j.status === "available").slice(0, 3);

  return (
    <div className="space-y-3">
      {/* My active missions */}
      <div>
        <h4 className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2 font-mono">
          YOUR ACTIVE MISSIONS ({myActive.length})
        </h4>
        {myActive.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 italic py-2">
            No active ops. Accept a contract from the board below to earn credits and rep for your clan.
          </p>
        ) : (
          <div className="space-y-1.5">
            {myActive.map(job => (
              <div key={job.id} className="flex items-center gap-3 border border-primary/20 px-3 py-2 bg-primary/5 hover:bg-primary/10 transition-colors shadow-[inset_2px_0_0_0_hsl(var(--primary))]">
                <CrosshairTargetSvg size={16} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{job.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] uppercase ${diffColor[job.difficulty] || "text-muted-foreground"}`}>{job.difficulty}</span>
                    <Badge variant="outline" className="text-[10px]">{job.type}</Badge>
                    {job.accepted_at && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {moment(job.accepted_at).fromNow()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {job.reward_reputation > 0 && (
                    <span className="text-[10px] text-accent flex items-center gap-0.5"><Award className="h-3 w-3" />+{job.reward_reputation}</span>
                  )}
                  {job.reward_credits > 0 && (
                    <span className="text-[10px] text-primary flex items-center gap-0.5"><Coins className="h-3 w-3" />+{job.reward_credits}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available to pick up */}
      {available.length > 0 && (
        <div>
          <h4 className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2 font-mono">
            AVAILABLE MISSIONS
          </h4>
          <div className="space-y-1">
            {available.map(job => (
              <div key={job.id} className="flex items-center gap-3 border border-border/40 px-3 py-2 hover:bg-secondary/30 transition-colors hover:shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.35)]">
                <CrosshairTargetSvg size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{job.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] uppercase ${diffColor[job.difficulty] || "text-muted-foreground"}`}>{job.difficulty}</span>
                    <Badge variant="outline" className="text-[10px]">{job.type}</Badge>
                  </div>
                </div>
                {job.reward_credits > 0 && (
                  <span className="text-[10px] text-primary shrink-0">+{job.reward_credits} CR</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continuity cue: if player has active mission, suggest planner */}
      {myActive.length > 0 && (
        <NextStepBanner
          to="/ops?tab=planner"
          icon={Target}
          label="Plan your op"
          hint="Assign survivors and assess sector risk before deploying."
          color="muted"
        />
      )}

      <Link to="/ops?tab=missions">
        <Button variant="outline" size="sm" className="w-full text-[10px] uppercase tracking-wider h-8 mt-1">
          Full Mission Board <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </Link>
    </div>
  );
}