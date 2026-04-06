import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StatusIndicator from "../terminal/StatusIndicator";
import InlineConfirm from "../terminal/InlineConfirm";
import {
  Crosshair, Clock, Award, MapPin, Shield, Loader2,
  CheckCircle, XCircle, LogOut, Coins
} from "lucide-react";
import moment from "moment";

const difficultyColor = {
  routine: "text-primary border-primary/30",
  hazardous: "text-accent border-accent/30",
  critical: "text-status-danger border-status-danger/30",
  suicide: "text-status-danger border-status-danger/50 font-bold",
};

const difficultyBg = {
  routine: "bg-primary/5",
  hazardous: "bg-accent/5",
  critical: "bg-status-danger/5",
  suicide: "bg-status-danger/10",
};

const statusMap = {
  available: "online",
  in_progress: "warning",
  completed: "active",
  failed: "critical",
  expired: "offline",
};

export default function MissionCard({ job, faction, territory, userEmail, isAdmin }) {
  const [acting, setActing] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isMine = job.assigned_to === userEmail;
  const canAccept = job.status === "available" && !job.assigned_to;
  const canComplete = job.status === "in_progress" && isMine;
  const canAbandon = job.status === "in_progress" && isMine;
  const isExpired = job.expires_at && new Date(job.expires_at) < new Date() && job.status === "available";

  const doAction = async (action) => {
    setActing(action);

    // Optimistic update — immediately reflect the change in UI
    const optimisticStatus = { accept: "in_progress", complete: "completed", abandon: "available", fail: "failed" };
    if (optimisticStatus[action]) {
      queryClient.setQueryData(["jobs"], (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((j) =>
          j.id === job.id
            ? {
                ...j,
                status: optimisticStatus[action],
                assigned_to: action === "accept" ? userEmail : action === "abandon" ? null : j.assigned_to,
              }
            : j
        );
      });
    }

    try {
      const res = await base44.functions.invoke("missionOps", { action, job_id: job.id });
      const data = res.data;
      if (action === "accept") {
        toast({ title: "Mission Accepted", description: `You are now assigned to: ${job.title}` });
      } else if (action === "complete") {
        const parts = [];
        if (data.reputation) parts.push(`+${data.reputation.delta} REP`);
        if (data.credits) parts.push(`+${data.credits} CR`);
        toast({ title: "Mission Complete!", description: parts.join(" · ") || "Good work, operative." });
      } else if (action === "abandon") {
        toast({ title: "Mission Abandoned", description: "Reputation penalty applied.", variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (err) {
      // Rollback optimistic update on failure
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Action Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  return (
    <div
      className={`border border-border bg-card rounded-sm overflow-hidden transition-colors hover:border-primary/30 ${difficultyBg[job.difficulty] || ""}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div className="px-4 py-3 cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Crosshair className="h-3.5 w-3.5 text-primary shrink-0" />
              <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
              {isMine && job.status === "in_progress" && (
                <Badge className="text-[10px] bg-accent/20 text-accent border-accent/30 shrink-0">YOUR MISSION</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-[10px] uppercase">{job.type}</Badge>
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${difficultyColor[job.difficulty]?.split(" ")[0] || "text-muted-foreground"}`}>
                {job.difficulty}
              </span>
              <StatusIndicator status={statusMap[job.status] || "offline"} label={job.status?.replace("_", " ")} />
              {faction && (
                <span className="flex items-center gap-1 text-[10px]">
                  <Shield className="h-3 w-3" style={{ color: faction.color }} />
                  <span style={{ color: faction.color }}>{faction.tag}</span>
                </span>
              )}
              {territory && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {territory.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {job.reward_reputation > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-accent">
                <Award className="h-3 w-3" /> +{job.reward_reputation} REP
              </div>
            )}
            {job.reward_credits > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-primary">
                <Coins className="h-3 w-3" /> +{job.reward_credits} CR
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-border/50 pt-2 space-y-2">
          {job.description && (
            <p className="text-xs text-muted-foreground">{job.description}</p>
          )}
          {job.reward_description && (
            <p className="text-[10px] text-accent italic">Reward: {job.reward_description}</p>
          )}
          {job.completion_notes && (
            <div className="bg-secondary/30 border border-border rounded-sm px-3 py-2">
              <p className="text-[9px] text-muted-foreground tracking-wider uppercase mb-0.5">MISSION REPORT</p>
              <p className="text-xs text-foreground">{job.completion_notes}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            {job.assigned_to && <span>Assigned: {job.assigned_to}</span>}
            {job.accepted_at && <span><Clock className="inline h-3 w-3 mr-0.5" />Accepted {moment(job.accepted_at).fromNow()}</span>}
            {job.completed_at && <span>Completed {moment(job.completed_at).fromNow()}</span>}
            {job.expires_at && job.status === "available" && (
              <span className={isExpired ? "text-status-danger" : ""}>
                <Clock className="inline h-3 w-3 mr-0.5" />
                {isExpired ? "EXPIRED" : `Expires ${moment(job.expires_at).fromNow()}`}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()} role="group" aria-label="Mission actions">
            {canAccept && !isExpired && (
              <Button size="sm" className="text-[10px] h-7 flex-1 uppercase tracking-wider" onClick={() => doAction("accept")} disabled={!!acting}>
                {acting === "accept" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                ACCEPT MISSION
              </Button>
            )}
            {canComplete && (
              <Button size="sm" className="text-[10px] h-7 flex-1 uppercase tracking-wider" onClick={() => doAction("complete")} disabled={!!acting}>
                {acting === "complete" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                REPORT COMPLETE
              </Button>
            )}
            {canAbandon && (
              <InlineConfirm
                variant="destructive"
                size="sm"
                className="text-[10px] h-7 uppercase tracking-wider"
                confirmLabel="ABANDON MISSION"
                warning="Abandoning applies a reputation penalty with the issuing faction. The mission returns to the board for others."
                severity="danger"
                onConfirm={() => doAction("abandon")}
                disabled={!!acting}
              >
                {acting === "abandon" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogOut className="h-3 w-3 mr-1" />}
                ABANDON
              </InlineConfirm>
            )}
            {isAdmin && job.status === "in_progress" && (
              <InlineConfirm
                variant="outline"
                size="sm"
                className="text-[10px] h-7 uppercase tracking-wider text-status-danger border-status-danger/30"
                confirmLabel="MARK FAILED"
                warning={`This fails the mission for ${job.assigned_to || "the operative"}. They may receive a reputation penalty.`}
                severity="danger"
                onConfirm={() => doAction("fail")}
                disabled={!!acting}
              >
                {acting === "fail" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                MARK FAILED
              </InlineConfirm>
            )}
          </div>
        </div>
      )}
    </div>
  );
}