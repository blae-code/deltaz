import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Crosshair,
  Map,
  Radio,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "SITREP", icon: LayoutDashboard },
  { path: "/jobs", label: "MISSIONS", icon: Crosshair },
  { path: "/map", label: "AO MAP", icon: Map },
  { path: "/events", label: "COMMS", icon: Radio },
  { path: "/factions", label: "FACTIONS", icon: Shield },
  { path: "/profile", label: "DOSSIER", icon: User },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar h-full transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
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

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
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
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="border-t border-border p-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 mx-auto" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}