import { Link } from "react-router-dom";
import { Map, BookOpen, Shield, Home, Package, Hammer, User } from "lucide-react";

const actions = [
  { to: "/map",              icon: Map,     label: "AO Map",   desc: "Scout the area" },
  { to: "/factions",         icon: Shield,  label: "Clans",    desc: "Known factions" },
  { to: "/colony",           icon: Home,    label: "Colony",   desc: "Base & survivors" },
  { to: "/loadout?tab=gear", icon: Package, label: "Gear",     desc: "Inventory" },
  { to: "/loadout?tab=workbench", icon: Hammer, label: "Craft", desc: "Workbench" },
  { to: "/journal",          icon: BookOpen,label: "Journal",  desc: "Field notes" },
  { to: "/profile",          icon: User,    label: "Profile",  desc: "Your dossier" },
];

export default function TodayActions() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
      {actions.map(a => (
        <Link
          key={a.to}
          to={a.to}
          className="flex flex-col items-center gap-1 border border-border rounded-sm p-3 hover:bg-secondary/40 hover:border-primary/30 transition-colors group text-center"
        >
          <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">{a.label}</span>
          <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{a.desc}</span>
        </Link>
      ))}
    </div>
  );
}
