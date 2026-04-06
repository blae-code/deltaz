import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusIndicator from "../terminal/StatusIndicator";
import { Clock, Lock, Bell, User, Volume2, VolumeX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDisplayName } from "../../lib/displayName";

export default function TopBar() {
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("sfx-muted") === "true"; } catch { return false; }
  });

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem("sfx-muted", String(next)); } catch {}
  };

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
            <button
              onClick={toggleMute}
              className="flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-primary transition-colors"
              aria-label={muted ? "Unmute audio" : "Mute audio"}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
            <p className="text-muted-foreground">{muted ? "Audio muted. Click to enable." : "Click to mute audio."}</p>
          </TooltipContent>
        </Tooltip>
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
          <>
            <Link
              to="/profile"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors border-l border-border pl-4"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <div className="h-6 w-6 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-xs text-primary font-semibold tracking-wider block leading-tight">
                        {getDisplayName(user)}
                      </span>
                      <span className="text-[8px] text-muted-foreground uppercase tracking-widest leading-tight">
                        {user.role || "player"}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30 max-w-[220px]">
                  <p className="text-primary font-semibold text-[10px] mb-0.5">OPERATIVE DOSSIER</p>
                  <p className="text-muted-foreground text-[10px]">Click to view your profile, reputation, and mission stats.</p>
                  {user.discord_username && <p className="text-muted-foreground text-[10px]">Discord: {user.discord_username}</p>}
                </TooltipContent>
              </Tooltip>
            </Link>
          </>
        )}
      </div>
    </header>
    </TooltipProvider>
  );
}