import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import StatusIndicator from "../components/terminal/StatusIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crosshair, Clock, Award } from "lucide-react";

const difficultyColor = {
  routine: "text-primary",
  hazardous: "text-accent",
  critical: "text-destructive",
  suicide: "text-destructive",
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Job.list("-created_date", 50)
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">LOADING MISSION DATA...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Mission Board
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Available operations — select and deploy</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "available", "in_progress", "completed", "failed"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7"
            onClick={() => setFilter(f)}
          >
            {f.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Job List */}
      {filtered.length === 0 ? (
        <DataCard title="No Missions">
          <p className="text-xs text-muted-foreground">No missions match current filter.</p>
        </DataCard>
      ) : (
        <div className="grid gap-3">
          {filtered.map((job) => (
            <div key={job.id} className="border border-border bg-card rounded-sm p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Crosshair className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
                  </div>
                  {job.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <Badge variant="outline" className="text-[10px] uppercase">{job.type}</Badge>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${difficultyColor[job.difficulty] || "text-muted-foreground"}`}>
                      {job.difficulty}
                    </span>
                    <StatusIndicator status={job.status === "available" ? "online" : job.status === "in_progress" ? "warning" : "offline"} label={job.status?.replace("_", " ")} />
                    {job.reward_reputation > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-accent">
                        <Award className="h-3 w-3" />
                        <span>+{job.reward_reputation} REP</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}