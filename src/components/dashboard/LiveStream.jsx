import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, Crosshair, Shield, MapPin, AlertTriangle, Zap } from "lucide-react";
import moment from "moment";

const MAX_ITEMS = 20;
const FADE_AFTER_MS = 30000;

const typeConfig = {
  event: { icon: Radio, color: "text-chart-4", label: "BROADCAST" },
  job_new: { icon: Crosshair, color: "text-accent", label: "NEW MISSION" },
  job_update: { icon: Crosshair, color: "text-primary", label: "MISSION UPDATE" },
  faction: { icon: Shield, color: "text-chart-5", label: "FACTION" },
  territory: { icon: MapPin, color: "text-accent", label: "TERRITORY" },
  reputation: { icon: Zap, color: "text-primary", label: "REP CHANGE" },
};

function StreamItem({ item }) {
  const config = typeConfig[item.type] || typeConfig.event;
  const Icon = config.icon;
  const age = Date.now() - item.timestamp;
  const isFading = age > FADE_AFTER_MS;

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2 border-b border-border/50 transition-opacity duration-1000 ${
        isFading ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-semibold uppercase tracking-widest ${config.color}`}>
            {config.label}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {moment(item.timestamp).fromNow()}
          </span>
        </div>
        <p className="text-[11px] text-foreground leading-tight mt-0.5">{item.text}</p>
      </div>
      {item.isNew && (
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5 pulse-glow" />
      )}
    </div>
  );
}

export default function LiveStream() {
  const [items, setItems] = useState([]);
  const scrollRef = useRef(null);

  const addItem = (type, text) => {
    const newItem = { id: crypto.randomUUID(), type, text, timestamp: Date.now(), isNew: true };
    setItems((prev) => {
      const updated = [newItem, ...prev].slice(0, MAX_ITEMS);
      return updated;
    });
    // Remove "new" glow after 3s
    setTimeout(() => {
      setItems((prev) => prev.map((i) => (i.id === newItem.id ? { ...i, isNew: false } : i)));
    }, 3000);
  };

  useEffect(() => {
    // Subscribe to real-time entity changes
    const unsubs = [];

    unsubs.push(
      base44.entities.Event.subscribe((ev) => {
        if (ev.type === "create") {
          const d = ev.data;
          const sev = d.severity === "critical" || d.severity === "emergency" ? "⚠ " : "";
          addItem("event", `${sev}${d.title}`);
        }
      })
    );

    unsubs.push(
      base44.entities.Job.subscribe((ev) => {
        const d = ev.data;
        if (ev.type === "create") {
          addItem("job_new", `New ${d.difficulty || ""} ${d.type || "mission"} posted: ${d.title}`);
        } else if (ev.type === "update" && d.status === "in_progress" && d.assigned_to) {
          addItem("job_update", `${d.title} — operative dispatched`);
        } else if (ev.type === "update" && d.status === "completed") {
          addItem("job_update", `${d.title} — mission complete ✓`);
        } else if (ev.type === "update" && d.status === "failed") {
          addItem("job_update", `${d.title} — mission failed ✗`);
        }
      })
    );

    unsubs.push(
      base44.entities.Territory.subscribe((ev) => {
        if (ev.type === "update") {
          addItem("territory", `${ev.data.name} (${ev.data.sector}) — status updated`);
        }
      })
    );

    unsubs.push(
      base44.entities.Faction.subscribe((ev) => {
        if (ev.type === "update") {
          addItem("faction", `${ev.data.name} — faction intel updated`);
        } else if (ev.type === "create") {
          addItem("faction", `New faction detected: ${ev.data.name} [${ev.data.tag}]`);
        }
      })
    );

    unsubs.push(
      base44.entities.ReputationLog.subscribe((ev) => {
        if (ev.type === "create") {
          const d = ev.data;
          const sign = d.delta > 0 ? "+" : "";
          addItem("reputation", `${d.reason} (${sign}${d.delta})`);
        }
      })
    );

    return () => unsubs.forEach((fn) => fn());
  }, []);

  // Refresh fade states periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => [...prev]);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/50">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
            LIVE FEED
          </h3>
        </div>
        <span className="text-[9px] text-muted-foreground tracking-wider">
          {items.length} SIGNAL{items.length !== 1 ? "S" : ""}
        </span>
      </div>

      {/* Stream */}
      <div ref={scrollRef} className="max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <Radio className="h-4 w-4 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-[10px] text-muted-foreground tracking-wider">
              MONITORING CHANNELS...
            </p>
          </div>
        ) : (
          items.map((item) => <StreamItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}