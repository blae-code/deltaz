import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Zap, Crosshair, Clock } from "lucide-react";
import moment from "moment";

const difficultyColor = {
  routine: "text-primary",
  hazardous: "text-status-warn",
  critical: "text-status-danger",
  suicide: "text-status-danger",
};

export default function MissionForgeFeed() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Job.filter({ status: "available" }, "-created_date", 8)
      .then(setJobs)
      .finally(() => setLoading(false));

    const unsub = base44.entities.Job.subscribe((event) => {
      if (event.type === "create" && event.data?.status === "available") {
        setJobs((prev) => [event.data, ...prev].slice(0, 8));
      } else if (event.type === "update") {
        setJobs((prev) => {
          const updated = prev.map((j) => (j.id === event.id ? event.data : j));
          return updated.filter((j) => j.status === "available");
        });
      } else if (event.type === "delete") {
        setJobs((prev) => prev.filter((j) => j.id !== event.id));
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <DataCard title="Mission Forge Feed">
        <div className="text-xs text-muted-foreground animate-pulse text-center py-4">SCANNING MISSIONS...</div>
      </DataCard>
    );
  }

  return (
    <DataCard
      title="Mission Forge Feed"
      headerRight={
        <div className="flex items-center gap-1 text-[9px] text-accent">
          <Zap className="h-3 w-3" />
          <span>{jobs.length} OPEN</span>
        </div>
      }
    >
      {jobs.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">No available missions.</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-start gap-2 p-2 border border-border/50 rounded-sm hover:bg-secondary/20 transition-colors">
              <Crosshair className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">{job.title}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[8px] uppercase">{job.type}</Badge>
                  <span className={`text-[9px] font-semibold uppercase ${difficultyColor[job.difficulty] || "text-muted-foreground"}`}>
                    {job.difficulty}
                  </span>
                  {job.reward_credits > 0 && (
                    <span className="text-[9px] text-accent">{job.reward_credits}c</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground shrink-0">
                <Clock className="h-2.5 w-2.5" />
                <span>{moment(job.created_date).fromNow()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DataCard>
  );
}