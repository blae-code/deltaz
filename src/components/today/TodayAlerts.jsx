import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import AlertSirenSvg from "../svg/AlertSirenSvg";
import RadioTowerSvg from "../svg/RadioTowerSvg";
import IntelEyeSvg from "../svg/IntelEyeSvg";
import moment from "moment";

const severityStyle = {
  emergency: "border-destructive/40 bg-destructive/5",
  critical: "border-destructive/30 bg-destructive/5",
  warning: "border-accent/30 bg-accent/5",
  info: "border-border",
  urgent: "border-accent/30 bg-accent/5",
  routine: "border-border",
};

const severityDot = {
  emergency: "bg-destructive",
  critical: "bg-destructive",
  warning: "bg-accent",
  urgent: "bg-accent",
  info: "bg-muted-foreground",
  routine: "bg-muted-foreground",
};

export default function TodayAlerts({ events, intel, broadcasts }) {
  // Merge into a single priority-ordered feed, newest first
  const items = [];

  (events || []).filter(e => e.is_active).slice(0, 3).forEach(e => {
    items.push({ id: `ev-${e.id}`, title: e.title, severity: e.severity, type: e.type?.replace("_", " "), time: e.created_date, source: "event" });
  });

  (intel || []).filter(i => i.is_active).slice(0, 2).forEach(i => {
    items.push({ id: `in-${i.id}`, title: i.title, severity: i.severity, type: i.category, time: i.created_date, source: "intel" });
  });

  (broadcasts || []).slice(0, 2).forEach(b => {
    items.push({ id: `bc-${b.id}`, title: b.title, severity: b.severity, type: b.channel?.replace("_", " "), time: b.created_date, source: "broadcast", faction: b.faction_name, factionColor: b.faction_color });
  });

  // Sort by time descending
  items.sort((a, b) => new Date(b.time) - new Date(a.time));
  const display = items.slice(0, 5);

  if (display.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground/60 italic">All quiet on the wire. No active threats, comms, or intel reports at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {display.map(item => (
        <div
          key={item.id}
          className={`flex items-start gap-2.5 border px-3 py-2 ${severityStyle[item.severity] || "border-border"} ${
            item.severity === "emergency" || item.severity === "critical" ? "shadow-[inset_2px_0_0_0_hsl(var(--destructive))]" :
            item.severity === "warning"   || item.severity === "urgent"   ? "shadow-[inset_2px_0_0_0_hsl(var(--accent))]" :
            "shadow-[inset_2px_0_0_0_hsl(var(--border))]"
          }`}
        >
          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${severityDot[item.severity] || "bg-muted-foreground"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{item.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
              {item.faction && (
                <span className="text-[10px]" style={{ color: item.factionColor }}>{item.faction}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{moment(item.time).fromNow()}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-1.5 mt-2">
        <Link to="/events" className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-[10px] uppercase tracking-wider h-8">
            <RadioTowerSvg size={14} className="mr-1" /> Comms
          </Button>
        </Link>
        <Link to="/intel" className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-[10px] uppercase tracking-wider h-8">
            <IntelEyeSvg size={14} className="mr-1" /> Intel
          </Button>
        </Link>
      </div>
    </div>
  );
}