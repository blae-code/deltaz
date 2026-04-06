import { Link } from "react-router-dom";
import {
  Crosshair, Map, Search, BookOpen, Shield, Target,
  TrendingUp, Trophy, Radio
} from "lucide-react";

const actions = [
  { to: "/jobs", icon: Crosshair, label: "Missions", desc: "Accept a mission" },
  { to: "/map", icon: Map, label: "AO Map", desc: "Scout the area" },
  { to: "/journal", icon: BookOpen, label: "Journal", desc: "Story events" },
  { to: "/planner", icon: Target, label: "Planner", desc: "Plan an op" },
  { to: "/factions", icon: Shield, label: "Clans", desc: "Your faction" },
  { to: "/market", icon: TrendingUp, label: "Market", desc: "Trade goods" },
  { to: "/events", icon: Radio, label: "Comms", desc: "News feed" },
  { to: "/records", icon: Trophy, label: "Records", desc: "Leaderboard" },
];

export default function TodayActions() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
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