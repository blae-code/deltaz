import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crosshair, Search, Filter } from "lucide-react";
import PriorityBadge from "../components/PriorityBadge";

const STATUS_STYLES = {
  available: "bg-primary/20 text-primary border-primary/30",
  accepted: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  in_progress: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  completed: "bg-muted text-muted-foreground",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground",
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    base44.entities.Job.list("-created_date", 100).then(data => {
      setJobs(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-primary animate-pulse-glow text-sm">LOADING OPERATIONS...</div>
      </div>
    );
  }

  const filtered = jobs.filter(j => {
    if (search && !j.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (typeFilter !== "all" && j.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono font-bold text-primary terminal-glow tracking-widest">OPERATIONS BOARD</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">{filtered.length} OPERATIONS LOGGED</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search operations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 font-mono text-xs bg-muted border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 font-mono text-xs bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL STATUS</SelectItem>
            <SelectItem value="available">AVAILABLE</SelectItem>
            <SelectItem value="accepted">ACCEPTED</SelectItem>
            <SelectItem value="in_progress">IN PROGRESS</SelectItem>
            <SelectItem value="completed">COMPLETED</SelectItem>
            <SelectItem value="failed">FAILED</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-8 font-mono text-xs bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL TYPES</SelectItem>
            <SelectItem value="recon">RECON</SelectItem>
            <SelectItem value="extraction">EXTRACTION</SelectItem>
            <SelectItem value="sabotage">SABOTAGE</SelectItem>
            <SelectItem value="delivery">DELIVERY</SelectItem>
            <SelectItem value="defense">DEFENSE</SelectItem>
            <SelectItem value="bounty">BOUNTY</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Job list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Crosshair className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-mono text-xs text-muted-foreground">NO MATCHING OPERATIONS</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(job => (
            <Card key={job.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono font-semibold text-foreground">{job.title}</span>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase ${STATUS_STYLES[job.status] || ""}`}>
                        {job.status?.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground line-clamp-2 mb-2">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-muted-foreground">
                      <span className="uppercase">TYPE: {job.type}</span>
                      {job.territory && <span>ZONE: {job.territory}</span>}
                      {job.faction && <span>FACTION: {job.faction}</span>}
                      {job.reward && <span className="text-chart-2">REWARD: {job.reward}</span>}
                    </div>
                  </div>
                  <PriorityBadge priority={job.priority} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}