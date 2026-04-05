import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Send, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const difficultyColor = {
  routine: "text-primary",
  hazardous: "text-accent",
  critical: "text-destructive",
  suicide: "text-destructive",
};

export default function DispatchPanel() {
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.Job.filter({ status: "available" }, "-created_date", 50),
      base44.entities.User.list("-created_date", 50),
    ]).then(([j, u]) => {
      setJobs(j);
      setUsers(u);
    });
  }, []);

  const handleDispatch = async () => {
    if (!selectedJob || !selectedUser) return;
    setDispatching(true);

    const job = jobs.find((j) => j.id === selectedJob);
    const user = users.find((u) => u.id === selectedUser);

    // Assign job to the operative
    await base44.entities.Job.update(selectedJob, {
      assigned_to: user.email,
      status: "in_progress",
    });

    // Create notification
    const priorityMap = { routine: "normal", hazardous: "high", critical: "critical", suicide: "critical" };
    await base44.entities.Notification.create({
      player_email: user.email,
      title: `Mission Assigned: ${job.title}`,
      message: `You have been assigned a ${job.difficulty} ${job.type} mission. Report for briefing immediately.`,
      type: "mission_assigned",
      priority: priorityMap[job.difficulty] || "normal",
      reference_id: selectedJob,
      is_read: false,
    });

    toast({ title: "Operative dispatched", description: `${user.full_name || user.email} assigned to ${job.title}` });

    // Refresh available jobs
    setJobs((prev) => prev.filter((j) => j.id !== selectedJob));
    setSelectedJob("");
    setSelectedUser("");
    setDispatching(false);
  };

  const selectedJobData = jobs.find((j) => j.id === selectedJob);

  return (
    <div className="space-y-4">
      {/* Job selector */}
      <div>
        <Label className="text-[10px] font-mono tracking-wider">SELECT MISSION</Label>
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger className="h-9 font-mono text-xs bg-muted mt-1">
            <SelectValue placeholder="Choose a mission..." />
          </SelectTrigger>
          <SelectContent>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                <span className="flex items-center gap-2">
                  <span>{j.title}</span>
                  <span className={`text-[10px] uppercase ${difficultyColor[j.difficulty] || ""}`}>
                    [{j.difficulty}]
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mission preview */}
      {selectedJobData && (
        <div className="border border-border rounded-sm p-3 bg-secondary/20 space-y-2">
          <div className="flex items-center gap-2">
            <Crosshair className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{selectedJobData.title}</span>
          </div>
          {selectedJobData.description && (
            <p className="text-[10px] text-muted-foreground">{selectedJobData.description}</p>
          )}
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[9px] uppercase">{selectedJobData.type}</Badge>
            <span className={`text-[10px] font-semibold uppercase ${difficultyColor[selectedJobData.difficulty] || "text-muted-foreground"}`}>
              {selectedJobData.difficulty}
            </span>
          </div>
        </div>
      )}

      {/* Operative selector */}
      <div>
        <Label className="text-[10px] font-mono tracking-wider">ASSIGN OPERATIVE</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="h-9 font-mono text-xs bg-muted mt-1">
            <SelectValue placeholder="Choose an operative..." />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                <span className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span>{u.full_name || u.email}</span>
                  <span className="text-[10px] text-muted-foreground">[{u.role}]</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dispatch button */}
      <Button
        onClick={handleDispatch}
        disabled={!selectedJob || !selectedUser || dispatching}
        className="w-full font-mono text-xs uppercase tracking-wider"
      >
        <Send className="h-3.5 w-3.5 mr-2" />
        {dispatching ? "DISPATCHING..." : "DISPATCH OPERATIVE"}
      </Button>

      {jobs.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center">No available missions to assign.</p>
      )}
    </div>
  );
}