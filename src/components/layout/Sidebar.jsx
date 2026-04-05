import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Crosshair, Map, Radio, Users, Shield,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { path: "/", label: "SITREP", icon: LayoutDashboard },
  { path: "/jobs", label: "JOBS", icon: Crosshair },
  { path: "/map", label: "MAP", icon: Map },
  { path: "/events", label: "SIGNALS", icon: Radio },
  { path: "/factions", label: "FACTIONS", icon: Users },
];

const ADMIN_ITEMS = [
  { path: "/admin", label: "COMMAND", icon: Shield },
];

export default function Sidebar({ userRole }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const items = userRole === "admin" ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <aside className={`${collapsed ? "w-16" : "w-52"} h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200`}>
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border flex items-center gap-2">
        <Radio className="w-5 h-5 text-primary animate-pulse-glow flex-shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-xs font-mono font-bold text-primary terminal-glow tracking-widest">DEAD SIGNAL</div>
            <div className="text-[10px] font-mono text-muted-foreground">FIELD TERMINAL v2.1</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-mono tracking-wider transition-colors
                ${active 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground border-l-2 border-transparent"
                }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4 mx-auto" /> : <ChevronLeft className="w-4 h-4 mx-auto" />}
      </button>
    </aside>
  );
}