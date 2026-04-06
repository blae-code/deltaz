import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Crosshair,
  Map,
  Radio,
  Shield,
  User,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Menu,
  X,
  TrendingUp,
  Home,
  FileSignature,
  Package,
  Trophy,
  FileText,
  ScrollText,
  Hammer,
  Truck,
  LogOut,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import NavTooltip from "./NavTooltip";
import { isAdminOrGM } from "../../lib/displayName";

const playerNav = [
  { path: "/", label: "SITREP", icon: LayoutDashboard },
  { path: "/jobs", label: "MISSIONS", icon: Crosshair },
  { path: "/map", label: "AO MAP", icon: Map },
  { path: "/events", label: "COMMS", icon: Radio },
  { path: "/factions", label: "CLANS", icon: Shield },
  { path: "/colony", label: "COLONY", icon: Home },
  { path: "/market", label: "MARKET", icon: TrendingUp },
  { path: "/inventory", label: "INVENTORY", icon: Package },
  { path: "/intel", label: "INTEL", icon: Eye },
  { path: "/treaties", label: "TREATIES", icon: FileSignature },
  { path: "/records", label: "RECORDS", icon: Trophy },
  { path: "/dossier", label: "DOSSIER", icon: FileText },
  { path: "/mission-log", label: "MISSION LOG", icon: ScrollText },
  { path: "/workbench", label: "WORKBENCH", icon: Hammer },
  { path: "/logistics", label: "LOGISTICS", icon: Truck },
  { path: "/journal", label: "JOURNAL", icon: BookOpen },
  { path: "/profile", label: "PROFILE", icon: User },
];

const adminNav = [
  { path: "/admin", label: "COMMAND", icon: Terminal },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = isAdminOrGM(user);
  const navItems = isAdmin ? [...playerNav, ...adminNav] : playerNav;

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-sm bg-card border border-border text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar h-full transition-all duration-200",
          // Desktop: normal sidebar
          "hidden md:flex",
          collapsed ? "w-16" : "w-56",
          // Mobile: slide-over
          mobileOpen && "!flex fixed inset-y-0 left-0 z-50 w-56"
        )}
      >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center">
          <Radio className="h-4 w-4 text-primary" />
        </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold font-display tracking-wider text-primary">
                DEAD SIGNAL
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest">
                FIELD TERMINAL v2.1
              </p>
            </div>
          )}
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavTooltip key={item.path} path={item.path} collapsed={collapsed}>
              <Link
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 text-xs font-medium tracking-wider transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </NavTooltip>
          );
        })}
      </nav>

      {/* User identity + Logout + Collapse */}
      <div className="border-t border-border">
        {user && !collapsed && (
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors group"
          >
            <div className="h-7 w-7 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 group-hover:border-primary/50 transition-colors">
              <span className="text-[10px] font-bold text-primary font-display">
                {(user.callsign || user.full_name || "?")[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-foreground truncate block leading-tight">
                {user.callsign || user.full_name || "Operative"}
              </span>
              <span className="text-[8px] text-muted-foreground uppercase tracking-widest leading-tight">
                {user.role || "player"}
              </span>
            </div>
          </Link>
        )}
        <NavTooltip path="#logout" collapsed={collapsed}>
          <button
            onClick={() => {
              setMobileOpen(false);
              base44.auth.logout();
            }}
            className={cn(
              "flex items-center gap-3 w-full px-5 py-2.5 text-xs font-medium tracking-wider text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>DISCONNECT</span>}
          </button>
        </NavTooltip>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full p-3 text-muted-foreground hover:text-foreground transition-colors hidden md:block"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 mx-auto" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
    </>
  );
}