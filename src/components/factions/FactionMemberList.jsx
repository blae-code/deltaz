import { User } from "lucide-react";
import StatusIndicator from "../terminal/StatusIndicator";

export default function FactionMemberList({ members }) {
  if (members.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground py-2">No registered operatives in this clan.</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-2 px-3 py-2 border border-border/50 rounded-sm bg-secondary/20 hover:bg-secondary/40 transition-colors"
        >
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-foreground font-mono truncate block">
              {m.callsign || m.full_name || "Unknown Operative"}
            </span>
            {m.discord_username && (
              <span className="text-[9px] text-muted-foreground">@{m.discord_username}</span>
            )}
          </div>
          <StatusIndicator
            status={m.status === "active" ? "online" : m.status === "mia" ? "warning" : "offline"}
            label={m.status || "unknown"}
          />
          {m.role === "admin" && (
            <span className="text-[8px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-sm tracking-wider font-semibold">GM</span>
          )}
        </div>
      ))}
    </div>
  );
}