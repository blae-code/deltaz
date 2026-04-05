import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Check, User, Crosshair, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const difficultyColor = {
  routine: "text-primary",
  hazardous: "text-accent",
  critical: "text-destructive",
  suicide: "text-destructive",
};

function scoreOperative(user, job, reputations, territories) {
  let score = 0;

  // Faction reputation score — higher rep with the job's faction = better fit
  if (job.faction_id) {
    const rep = reputations.find(
      (r) => r.player_email === user.email && r.faction_id === job.faction_id
    );
    if (rep) {
      score += rep.score; // direct score contribution
    }
  }

  // Difficulty penalty — higher difficulty jobs prefer higher-rep operatives
  const difficultyWeight = { routine: 0, hazardous: 50, critical: 150, suicide: 300 };
  const reqThreshold = difficultyWeight[job.difficulty] || 0;
  const totalRep = reputations
    .filter((r) => r.player_email === user.email)
    .reduce((sum, r) => sum + Math.max(0, r.score), 0);
  
  if (totalRep >= reqThreshold) {
    score += 50; // meets difficulty threshold bonus
  } else {
    score -= 100; // penalty for under-qualified
  }

  return score;
}

function computeAssignments(jobs, users, reputations, territories) {
  const assignments = [];
  const assignedUsers = new Set();
  const assignedJobs = new Set();

  // Sort jobs by difficulty descending — assign hardest first
  const sortedJobs = [...jobs].sort((a, b) => {
    const order = { suicide: 4, critical: 3, hazardous: 2, routine: 1 };
    return (order[b.difficulty] || 0) - (order[a.difficulty] || 0);
  });

  for (const job of sortedJobs) {
    let bestUser = null;
    let bestScore = -Infinity;

    for (const user of users) {
      if (assignedUsers.has(user.email)) continue;
      const s = scoreOperative(user, job, reputations, territories);
      if (s > bestScore) {
        bestScore = s;
        bestUser = user;
      }
    }

    if (bestUser) {
      assignments.push({ job, user: bestUser, score: bestScore });
      assignedUsers.add(bestUser.email);
      assignedJobs.add(job.id);
    }
  }

  return assignments;
}

export default function AutoAssignPanel() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [computed, setComputed] = useState(false);
  const [rawData, setRawData] = useState(null);
  const { toast } = useToast();

  const computeMatches = async () => {
    setLoading(true);
    const [jobs, users, reputations, territories] = await Promise.all([
      base44.entities.Job.filter({ status: "available" }, "-created_date", 50),
      base44.entities.User.list("-created_date", 100),
      base44.entities.Reputation.list("-created_date", 500),
      base44.entities.Territory.list("-created_date", 50),
    ]);

    setRawData({ jobs, users, reputations, territories });
    const result = computeAssignments(jobs, users, reputations, territories);
    setAssignments(result);
    setComputed(true);
    setLoading(false);
  };

  const dispatchAll = async () => {
    setDispatching(true);
    const priorityMap = { routine: "normal", hazardous: "high", critical: "critical", suicide: "critical" };

    for (const { job, user } of assignments) {
      await base44.entities.Job.update(job.id, {
        assigned_to: user.email,
        status: "in_progress",
      });
      await base44.entities.Notification.create({
        player_email: user.email,
        title: `Mission Assigned: ${job.title}`,
        message: `You have been auto-assigned a ${job.difficulty} ${job.type} mission based on your reputation profile. Report for briefing.`,
        type: "mission_assigned",
        priority: priorityMap[job.difficulty] || "normal",
        reference_id: job.id,
        is_read: false,
      });
    }

    toast({
      title: "Auto-dispatch complete",
      description: `${assignments.length} operative(s) dispatched successfully.`,
    });
    setAssignments([]);
    setComputed(false);
    setDispatching(false);
  };

  const removeAssignment = (idx) => {
    setAssignments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-muted-foreground">
        Automatically match available missions to operatives based on clan reputation standing and mission difficulty requirements.
      </p>

      <Button
        onClick={computeMatches}
        disabled={loading}
        variant="outline"
        className="w-full font-mono text-xs uppercase tracking-wider"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
        {loading ? "ANALYZING OPERATIVES..." : "COMPUTE OPTIMAL ASSIGNMENTS"}
      </Button>

      {computed && assignments.length === 0 && (
        <div className="border border-border rounded-sm p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-accent mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            No viable matches found. Either no jobs are available or no operatives are unassigned.
          </p>
        </div>
      )}

      {assignments.length > 0 && (
        <>
          <div className="text-[10px] text-muted-foreground tracking-wider uppercase">
            Proposed Assignments ({assignments.length})
          </div>

          <div className="space-y-2">
            {assignments.map((a, idx) => (
              <div
                key={idx}
                className="border border-border bg-secondary/20 rounded-sm p-3 flex items-center gap-3"
              >
                {/* Job info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Crosshair className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {a.job.title}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase shrink-0">
                      {a.job.type}
                    </Badge>
                    <span
                      className={`text-[9px] font-semibold uppercase ${difficultyColor[a.job.difficulty] || "text-muted-foreground"}`}
                    >
                      {a.job.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-chart-4 shrink-0" />
                    <span className="text-[10px] text-chart-4">
                      {a.user.full_name || a.user.email}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      MATCH: {a.score > 0 ? "+" : ""}
                      {a.score}
                    </span>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeAssignment(idx)}
                  className="text-muted-foreground hover:text-destructive shrink-0 text-[10px] uppercase tracking-wider"
                >
                  SKIP
                </button>
              </div>
            ))}
          </div>

          <Button
            onClick={dispatchAll}
            disabled={dispatching || assignments.length === 0}
            className="w-full font-mono text-xs uppercase tracking-wider"
          >
            <Zap className="h-3.5 w-3.5 mr-2" />
            {dispatching
              ? "DISPATCHING..."
              : `CONFIRM & DISPATCH ALL (${assignments.length})`}
          </Button>
        </>
      )}
    </div>
  );
}