import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, Wifi, WifiOff } from "lucide-react";

const stateConfig = {
  running: { label: "ONLINE", color: "bg-status-ok", textColor: "text-status-ok" },
  starting: { label: "STARTING", color: "bg-status-warn", textColor: "text-status-warn" },
  stopping: { label: "STOPPING", color: "bg-status-warn", textColor: "text-status-warn" },
  offline: { label: "OFFLINE", color: "bg-status-danger", textColor: "text-status-danger" },
};

function formatUptime(ms) {
  if (!ms) return "N/A";
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function ServerStatusPanel({ status, loading, onRefresh }) {
  const state = status?.current_state || "offline";
  const cfg = stateConfig[state] || stateConfig.offline;
  const isOnline = state === "running";

  return (
    <div className="border border-border bg-card rounded-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-sm border ${isOnline ? 'border-primary/40 bg-primary/10' : 'border-destructive/40 bg-destructive/10'} flex items-center justify-center`}>
            {isOnline ? <Wifi className="h-5 w-5 text-primary" /> : <WifiOff className="h-5 w-5 text-destructive" />}
          </div>
          <div>
            <h3 className="text-sm font-bold font-display tracking-wider text-foreground uppercase">
              GAME SERVER
            </h3>
            <p className="text-[10px] text-muted-foreground tracking-widest font-mono">
              HUMANITZ DEDICATED
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.color} pulse-glow`} />
            <span className={`text-xs font-bold font-mono tracking-wider ${cfg.textColor}`}>
              {cfg.label}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="bg-secondary/50 rounded-sm p-2">
            <p className="text-[10px] text-muted-foreground font-mono">UPTIME</p>
            <p className="text-xs font-bold font-mono text-foreground">{formatUptime(status.resources?.uptime)}</p>
          </div>
          <div className="bg-secondary/50 rounded-sm p-2">
            <p className="text-[10px] text-muted-foreground font-mono">CPU</p>
            <p className="text-xs font-bold font-mono text-foreground">{(status.resources?.cpu_absolute || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-secondary/50 rounded-sm p-2">
            <p className="text-[10px] text-muted-foreground font-mono">MEMORY</p>
            <p className="text-xs font-bold font-mono text-foreground">
              {((status.resources?.memory_bytes || 0) / 1024 / 1024).toFixed(0)} MB
            </p>
          </div>
          <div className="bg-secondary/50 rounded-sm p-2">
            <p className="text-[10px] text-muted-foreground font-mono">DISK</p>
            <p className="text-xs font-bold font-mono text-foreground">
              {((status.resources?.disk_bytes || 0) / 1024 / 1024).toFixed(0)} MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}