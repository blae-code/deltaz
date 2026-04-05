import { Badge } from "@/components/ui/badge";
import moment from "moment";
import {
  Radio, Power, Terminal, AlertTriangle, Users, Settings, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";

const categoryConfig = {
  rcon_command: { icon: Terminal, label: "RCON", color: "text-chart-4" },
  power_action: { icon: Power, label: "POWER", color: "text-accent" },
  broadcast: { icon: Radio, label: "BROADCAST", color: "text-primary" },
  status_change: { icon: AlertTriangle, label: "STATUS", color: "text-status-warn" },
  player_event: { icon: Users, label: "PLAYER", color: "text-status-info" },
  system: { icon: Settings, label: "SYSTEM", color: "text-muted-foreground" },
};

const severityBadge = {
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-status-warn/10 text-status-warn border-status-warn/20",
  error: "bg-status-danger/10 text-status-danger border-status-danger/20",
  critical: "bg-status-danger/20 text-status-danger border-status-danger/40",
};

export default function LogEntry({ log }) {
  const [expanded, setExpanded] = useState(false);
  const config = categoryConfig[log.category] || categoryConfig.system;
  const Icon = config.icon;
  const hasMeta = log.metadata && log.metadata !== "{}";

  return (
    <div className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
        onClick={() => hasMeta && setExpanded(!expanded)}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />

        <span className="text-[9px] font-mono text-muted-foreground w-16 shrink-0 tracking-wider">
          {moment(log.created_date).format("HH:mm:ss")}
        </span>

        <Badge
          variant="outline"
          className={`text-[8px] px-1.5 py-0 h-4 shrink-0 ${severityBadge[log.severity] || severityBadge.info}`}
        >
          {config.label}
        </Badge>

        <span className="text-[11px] text-foreground flex-1 min-w-0 truncate">
          {log.detail}
        </span>

        {log.actor_callsign && (
          <span className="text-[9px] text-muted-foreground shrink-0 hidden sm:block">
            {log.actor_callsign}
          </span>
        )}

        {hasMeta && (
          expanded
            ? <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && hasMeta && (
        <div className="px-4 pb-3 pl-[4.5rem]">
          <pre className="text-[10px] font-mono text-muted-foreground bg-background border border-border rounded-sm p-2 overflow-x-auto max-h-32 whitespace-pre-wrap">
            {(() => {
              try { return JSON.stringify(JSON.parse(log.metadata), null, 2); }
              catch { return log.metadata; }
            })()}
          </pre>
        </div>
      )}
    </div>
  );
}