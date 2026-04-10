import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Map, BookOpen, Shield, Home, Package, Hammer, User } from "lucide-react";

const actions = [
  {
    to: "/map",
    icon: Map,
    label: "AO Map",
    desc: "Scout the area",
    tip: "Place personal markers, view shared pins, and locate registered bases on the tactical grid.",
  },
  {
    to: "/factions",
    icon: Shield,
    label: "Clans",
    desc: "Known factions",
    tip: "Browse registered clans, check member rosters, and review your standing with each faction.",
  },
  {
    to: "/colony",
    icon: Home,
    label: "Colony",
    desc: "Base & survivors",
    tip: "Manage your registered bases, assign survivors to tasks, and track module status.",
  },
  {
    to: "/loadout?tab=gear",
    icon: Package,
    label: "Gear",
    desc: "Inventory",
    tip: "Log, edit, and track your personal inventory — weapons, tools, consumables, and gear condition.",
  },
  {
    to: "/loadout?tab=workbench",
    icon: Hammer,
    label: "Craft",
    desc: "Workbench",
    tip: "Track active crafting projects, log gathered materials, and mark builds as complete.",
  },
  {
    to: "/journal",
    icon: BookOpen,
    label: "Journal",
    desc: "Field notes",
    tip: "Personal field journal — log encounters, observations, and notes from your runs.",
  },
  {
    to: "/profile",
    icon: User,
    label: "Profile",
    desc: "Your dossier",
    tip: "View and update your operative profile — callsign, Discord handle, role, and faction standing.",
  },
];

export default function TodayActions() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
        {actions.map(a => (
          <Tooltip key={a.to}>
            <TooltipTrigger asChild>
              <Link
                to={a.to}
                className="panel-frame flex flex-col items-center gap-1 p-3 hover:bg-secondary/40 hover:border-primary/30 hover:shadow-[inset_0_-2px_0_0_hsl(var(--primary)/0.5)] transition-all group text-center"
              >
                <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors tracking-wider uppercase">
                  {a.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{a.desc}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30 max-w-[220px]">
              <p className="font-semibold text-[10px] mb-0.5 text-primary uppercase tracking-wider">{a.label}</p>
              <p className="text-muted-foreground">{a.tip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
