import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import StatusIndicator from "../terminal/StatusIndicator";
import { Clock, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDisplayName } from "../../lib/displayName";

export default function TopBar() {
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d) => {
    const date = d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
    const clock = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.split("/").pop()?.replace(/_/g, " ") || "LOCAL";
    return `${date} ${clock} ${tz}`;
  };

  return (
    <TooltipProvider delayDuration={200}>
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div><StatusIndicator status="online" label="SYSTEM ONLINE" className="cursor-help" /></div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
            <p className="text-primary font-semibold text-[10px] mb-0.5">CONNECTION STATUS</p>
            <p className="text-muted-foreground">All backend systems nominal. Real-time subscriptions active.</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-help">
              <Lock className="h-3 w-3" />
              <span className="tracking-wider">ENCRYPTED</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
            <p className="text-primary font-semibold text-[10px] mb-0.5">SECURE CHANNEL</p>
            <p className="text-muted-foreground">End-to-end encrypted data link between your terminal and Dead Signal HQ.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono cursor-help">
              <Clock className="h-3 w-3" />
              <span>{formatTime(time)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
            <p className="text-muted-foreground">Local time — synced to your terminal's system clock.</p>
          </TooltipContent>
        </Tooltip>
        {user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 border-l border-border pl-4 cursor-help">
                <span className="text-xs text-primary font-semibold tracking-wider">
                  {getDisplayName(user)}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  [{user.role || "player"}]
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30 max-w-[220px]">
              <p className="text-primary font-semibold text-[10px] mb-0.5">OPERATIVE ID</p>
              <p className="text-muted-foreground text-[10px]">Callsign: {getDisplayName(user)}</p>
              {user.discord_username && <p className="text-muted-foreground text-[10px]">Discord: {user.discord_username}</p>}
              <p className="text-muted-foreground mt-1">Clearance: <span className="text-foreground uppercase">{user.role || "player"}</span></p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
    </TooltipProvider>
  );
}