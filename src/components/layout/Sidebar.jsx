import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  User,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  BookOpen,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import NavTooltip from "./NavTooltip";
import { isAdminOrGM } from "../../lib/displayName";
import SidebarLogoSvg from "../svg/SidebarLogoSvg";
import CornerAccentSvg from "../svg/CornerAccentSvg";

// ── v1 nav — Today + personal ────────────────────────────────────────────────
const playerNav = [
  { path: "/",         label: "TODAY",   icon: Zap },
  { path: "/journal",  label: "JOURNAL", icon: BookOpen },
  { path: "/profile",  label: "PROFILE", icon: User },
];

const adminNav = [
  { path: "/admin", label: "COMMAND", icon: Terminal },
];

export default function Sidebar({ user: propUser }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(propUser || null);

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
    } else {
      base44.auth.me().then(setUser).catch(() => {});
    }
  }, [propUser]);

  const isAdmin = isAdminOrGM(user);

  const activeGroups = [
    { label: null, items: playerNav },
    ...(isAdmin ? [{ label: "GM", items: adminNav }] : []),
  ];

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden p-2.5 rounded-sm bg-card border border-border text-muted-foreground hover:text-foreground shadow-lg"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden backdrop-blur-[1px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar h-full transition-all duration-200",
          "hidden md:flex",
          collapsed ? "w-14" : "w-52",
          mobileOpen && "!flex fixed inset-y-0 left-0 z-50 w-52"
        )}
      >
        {/* Logo */}
        <div className="relative flex items-center justify-between border-b border-border px-3 py-3.5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/90 via-primary/40 to-transparent pointer-events-none" />
          {/* Top-right corner accent */}
          <div className="absolute right-0 top-0 pointer-events-none">
            <CornerAccentSvg corner="tr" size={12} />
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 shadow-[0_0_8px_hsl(var(--primary)/0.15)]">
              <SidebarLogoSvg size={16} className="text-primary" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[8px] text-primary/50 font-mono tracking-[0.4em] leading-none mb-0.5">[ DS ]</div>
                <h1 className="text-[13px] font-bold font-display tracking-[0.18em] text-primary leading-none">
                  DEAD SIGNAL
                </h1>
                <p className="text-[8px] text-muted-foreground/60 tracking-[0.3em] font-mono mt-0.5">
                  FIELD TERMINAL
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-1.5 overflow-y-auto space-y-3 scrollbar-none">

          {/* Active groups */}
          {activeGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && !collapsed && (
                <div className="px-2.5 pt-2 pb-1 flex items-center gap-2">
                  <span className="text-[9px] font-mono text-primary/30 tracking-[0.25em] uppercase">
                    // {group.label}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              )}
              {group.label && collapsed && (
                <div className="mx-auto my-1.5 w-5 border-t border-border/50" />
              )}
              <div className="space-y-px">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path
                    || (item.path !== "/" && location.pathname.startsWith(item.path));
                  return (
                    <NavTooltip key={item.path} path={item.path} collapsed={collapsed}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[11px] font-medium tracking-wider transition-colors",
                          collapsed && "justify-center px-0 py-2.5",
                          isActive
                            ? "bg-primary/10 text-primary shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
                            : "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40"
                        )}
                      >
                        <item.icon className={cn("shrink-0", collapsed ? "h-4 w-4" : "h-3.5 w-3.5")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </NavTooltip>
                  );
                })}
              </div>
            </div>
          ))}

        </nav>

        {/* Footer — user identity + logout + collapse toggle */}
        <div className="border-t border-border/60">
          {user && !collapsed && (
            <Link
              to="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40 hover:bg-secondary/30 transition-colors group"
            >
              <div className="h-6 w-6 rounded-sm bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 group-hover:border-primary/45 transition-colors">
                <span className="text-[10px] font-bold text-primary font-display">
                  {(user.callsign || user.full_name || "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold text-foreground truncate block leading-tight">
                  {user.callsign || user.full_name || "Operative"}
                </span>
                <span className="text-[9px] text-muted-foreground/70 uppercase tracking-widest leading-tight font-mono">
                  {user.role || "PLAYER"}
                </span>
              </div>
            </Link>
          )}

          <div className="flex items-center">
            <NavTooltip path="#logout" collapsed={collapsed}>
              <button
                onClick={() => { setMobileOpen(false); base44.auth.logout(); }}
                className={cn(
                  "flex items-center gap-2 flex-1 px-3 py-2.5 text-[10px] font-mono tracking-widest text-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-colors",
                  collapsed && "justify-center px-0"
                )}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && <span>DISCONNECT</span>}
              </button>
            </NavTooltip>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex items-center justify-center h-full px-3 py-2.5 text-muted-foreground/40 hover:text-muted-foreground border-l border-border/40 transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed
                ? <ChevronRight className="h-3.5 w-3.5" />
                : <ChevronLeft className="h-3.5 w-3.5" />
              }
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}