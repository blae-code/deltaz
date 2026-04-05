import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import ColonyGauge from "./ColonyGauge";
import ColonyAlerts from "./ColonyAlerts";
import ColonyBroadcast from "./ColonyBroadcast";
import ColonyMetricEditor from "./ColonyMetricEditor";
import { Badge } from "@/components/ui/badge";
import { Activity, Users } from "lucide-react";

const threatColors = {
  minimal: "text-status-ok",
  low: "text-status-ok",
  moderate: "text-status-warn",
  high: "text-status-danger",
  critical: "text-status-danger animate-pulse",
};

export default function ColonyMonitor({ isAdmin }) {
  const [colony, setColony] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const loadColony = async () => {
    const list = await base44.entities.ColonyStatus.list("-updated_date", 1);
    if (list.length > 0) {
      setColony(list[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadColony();
    const unsub = base44.entities.ColonyStatus.subscribe((event) => {
      if (event.type === "create" || event.type === "update") {
        setColony(event.data);
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <DataCard title="Colony Status Monitor">
        <p className="text-[10px] text-muted-foreground animate-pulse">SCANNING COLONY SYSTEMS...</p>
      </DataCard>
    );
  }

  if (!colony) {
    if (!isAdmin) return null;
    return (
      <DataCard title="Colony Status Monitor">
        <p className="text-[10px] text-muted-foreground mb-2">No colony status record found.</p>
        <button
          onClick={async () => {
            await base44.entities.ColonyStatus.create({ colony_name: "Main Colony" });
            loadColony();
          }}
          className="text-[10px] text-primary underline hover:text-primary/80"
        >
          Initialize Colony Tracking
        </button>
      </DataCard>
    );
  }

  const gauges = [
    { label: "FOOD", value: colony.food_reserves, icon: "🌾" },
    { label: "MORALE", value: colony.morale, icon: "🧠" },
    { label: "DEFENSE", value: colony.defense_integrity, icon: "🛡️" },
    { label: "WATER", value: colony.water_supply, icon: "💧" },
    { label: "MEDICAL", value: colony.medical_supplies, icon: "💊" },
    { label: "POWER", value: colony.power_level, icon: "⚡" },
  ];

  const alerts = gauges.filter(g => (g.value ?? 100) < 30);
  const warnings = gauges.filter(g => (g.value ?? 100) >= 30 && (g.value ?? 100) < 50);

  return (
    <DataCard
      title="Colony Status Monitor"
      headerRight={
        <div className="flex items-center gap-2">
          {colony.population > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Users className="h-3 w-3" /> {colony.population}
            </span>
          )}
          <Badge
            variant="outline"
            className={`text-[8px] uppercase ${threatColors[colony.threat_level] || "text-muted-foreground"}`}
          >
            THREAT: {colony.threat_level || "unknown"}
          </Badge>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Gauges grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {gauges.map(g => (
            <ColonyGauge key={g.label} label={g.label} value={g.value ?? 100} icon={g.icon} />
          ))}
        </div>

        {/* Alerts */}
        <ColonyAlerts alerts={alerts} warnings={warnings} lastIncident={colony.last_incident} />

        {/* GM Controls */}
        {isAdmin && (
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-primary" />
              <span className="text-[9px] text-primary tracking-widest font-semibold">GM CONTROLS</span>
            </div>

            <ColonyBroadcast />

            <button
              onClick={() => setEditing(!editing)}
              className="text-[10px] text-muted-foreground hover:text-primary underline"
            >
              {editing ? "Hide Metric Editor" : "Edit Colony Metrics"}
            </button>

            {editing && <ColonyMetricEditor colony={colony} onUpdated={loadColony} />}
          </div>
        )}
      </div>
    </DataCard>
  );
}