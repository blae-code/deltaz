import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusIndicator from "../terminal/StatusIndicator";
import { Clock, Lock, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import GlobalSearchDialog from "../search/GlobalSearchDialog";
import NotificationDropdown from "./NotificationDropdown";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDisplayName, isAdminOrGM } from "../../lib/displayName";

export default function TopBar({ user: propUser }) {
  const [user, setUser] = useState(propUser || null);
  const [time, setTime] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
    } else {
      base44.auth.me().then(setUser).catch(() => {});
    }
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [propUser]);

  // Ctrl+K / Cmd+K to open search
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

  const formatTime = (d) => {
    const date = d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
    const clock = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.split("/").pop()?.replace(/_/g, " ") || "LOCAL";
    return `${date} ${clock} ${tz}`;
  };

  return (
    <TooltipProvider delayDuration={200}>
    <header className="flex items-center justify-between border-b border-border bg-card px-3 sm:px-4 py-2.5">
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
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-help">
              <Lock className="h-3.5 w-3.5" />
              <span className="tracking-wider">ENCRYPTED</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
            <p className="text-primary font-semibold text-[10px] mb-0.5">SECURE CHANNEL</p>
            <p className="text-muted-foreground">End-to-end encrypted data link between your terminal and Dead Signal HQ.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        {user?.email && <NotificationDropdown userEmail={user.email} />}
        {/* Search button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono border border-border rounded-sm px-2.5 py-1.5 hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <Search className="h-3 w-3" />
          <span className="hidden sm:inline tracking-wider">SEARCH</span>
          <kbd className="hidden md:inline text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground/60 ml-1">⌘K</kbd>
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono cursor-help">
             <Clock className="h-3.5 w-3.5" />
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
                      <span className={cn(
                        "text-[10px] uppercase tracking-widest leading-tight",
                        isAdminOrGM(user) ? "text-accent" : "text-muted-foreground"
                      )}>
                        {isAdminOrGM(user) ? "GM" : "OPERATIVE"}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-xs bg-card border-primary/30 max-w-[220px]">
                  <p className="text-primary font-semibold text-[11px] mb-0.5">OPERATIVE DOSSIER</p>
                  <p className="text-muted-foreground text-[11px]">Click to view your profile, reputation, and mission stats.</p>
                  {user.discord_username && <p className="text-muted-foreground text-[11px]">Discord: {user.discord_username}</p>}
                </TooltipContent>
              </Tooltip>
            </Link>
          </>
        )}
      </div>
    </header>
    <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </TooltipProvider>
  );
}