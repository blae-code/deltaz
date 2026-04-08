import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusIndicator from "../terminal/StatusIndicator";
import { Clock, Lock, Search, Activity } from "lucide-react";
import SidebarLogoSvg from "../svg/SidebarLogoSvg";
import { cn } from "@/lib/utils";
import GlobalSearchDialog from "../search/GlobalSearchDialog";
import NotificationDropdown from "./NotificationDropdown";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDisplayName, isAdminOrGM } from "../../lib/displayName";

// Short stable session token derived from user email — purely decorative
function sessionTag(email) {
  if (!email) return "----";
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (Math.imul(31, h) + email.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 6);
}

export default function TopBar({ user: propUser }) {
  const [user, setUser] = useState(propUser || null);
  const [time, setTime] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [uptime, setUptime] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
    } else {
      base44.auth.me().then(setUser).catch(() => {});
    }
    const interval = setInterval(() => {
      setTime(new Date());
      setUptime(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [propUser]);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const formatClock = (d) =>
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const formatDate = (d) =>
    d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.split("/").pop()?.replace(/_/g, " ") || "LOCAL";

  const formatUptime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const sess = sessionTag(user?.email);

  return (
    <TooltipProvider delayDuration={200}>
      <header className="relative flex items-center justify-between border-b border-border bg-card px-3 sm:px-4 h-[42px] shrink-0">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/50 via-primary/15 to-transparent pointer-events-none" />

        {/* Left cluster */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <StatusIndicator status="online" label="ONLINE" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
              <p className="text-primary font-semibold text-[10px] mb-0.5">CONNECTION STATUS</p>
              <p className="text-muted-foreground">All backend systems nominal. Real-time subscriptions active.</p>
            </TooltipContent>
          </Tooltip>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-mono">
            <Lock className="h-3 w-3 text-muted-foreground/40" />
            <span className="tracking-wider">ENCRYPTED</span>
          </div>

          {/* Session telemetry */}
          <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono text-muted-foreground/40 tracking-wider border-l border-border/40 pl-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help hover:text-muted-foreground/70 transition-colors">
                  SESS·<span className="text-primary/50">{sess}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
                <p className="text-muted-foreground">Session token — unique to this operative's connection.</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help hover:text-muted-foreground/70 transition-colors flex items-center gap-1">
                  <Activity className="h-2.5 w-2.5 text-primary/30" />
                  UP·{formatUptime(uptime)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
                <p className="text-muted-foreground">Terminal session uptime since last connect.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user?.email && <NotificationDropdown userEmail={user.email} />}

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors font-mono border border-border/60 rounded-sm px-2 py-1 hover:border-primary/30"
          >
            <Search className="h-3 w-3" />
            <span className="hidden sm:inline tracking-wider">SEARCH</span>
            <kbd className="hidden md:inline text-[9px] bg-secondary/80 px-1 rounded text-muted-foreground/50 ml-0.5">⌘K</kbd>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-mono border-l border-border/40 pl-3">
            <Clock className="h-3 w-3 text-muted-foreground/40" />
            <span>{formatDate(time)}</span>
            <span className="text-primary/60 tabular-nums">{formatClock(time)}</span>
            <span className="text-muted-foreground/30">{tz}</span>
          </div>

          {user && (
            <Link
              to="/profile"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors border-l border-border/40 pl-3"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <div className="h-6 w-6 rounded-sm bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
                      <SidebarLogoSvg size={13} className="text-primary" />
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-[11px] text-primary font-semibold tracking-wider block leading-tight">
                        {getDisplayName(user)}
                      </span>
                      <span className={cn(
                        "text-[9px] uppercase tracking-widest leading-tight font-mono",
                        isAdminOrGM(user) ? "text-accent" : "text-muted-foreground/50"
                      )}>
                        {isAdminOrGM(user) ? "GM" : "OPERATIVE"}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-xs bg-card border-primary/30 max-w-[220px]">
                  <p className="text-primary font-semibold text-[11px] mb-0.5">OPERATIVE DOSSIER</p>
                  <p className="text-muted-foreground text-[11px]">View profile, reputation, and mission stats.</p>
                  {user.discord_username && (
                    <p className="text-muted-foreground text-[11px]">Discord: {user.discord_username}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </Link>
          )}
        </div>
      </header>
      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </TooltipProvider>
  );
}
