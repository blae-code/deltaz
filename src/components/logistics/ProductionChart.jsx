import DataCard from "../terminal/DataCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useState } from "react";

const RESOURCES = ["fuel", "metals", "tech", "food", "munitions"];
const RESOURCE_COLORS = {
  fuel: "#d4a13a",
  metals: "#c8935b",
  tech: "#df8116",
  food: "#4ade80",
  munitions: "#c53030",
};

export default function ProductionChart({ economies }) {
  const [chartType, setChartType] = useState("bar");

  // Bar chart data: one entry per faction, resource values as keys
  const barData = economies.map(e => {
    const prod = e.resource_production || {};
    const modifier = e.supply_chain_modifier || 1;
    return {
      name: e.faction_tag || "???",
      fuel: Math.round((prod.fuel || 0) * modifier),
      metals: Math.round((prod.metals || 0) * modifier),
      tech: Math.round((prod.tech || 0) * modifier),
      food: Math.round((prod.food || 0) * modifier),
      munitions: Math.round((prod.munitions || 0) * modifier),
    };
  });

  // Radar data: one entry per resource, faction values as keys
  const radarData = RESOURCES.map(res => {
    const entry = { resource: res.toUpperCase() };
    economies.forEach(e => {
      const prod = e.resource_production || {};
      const modifier = e.supply_chain_modifier || 1;
      entry[e.faction_tag || e.id] = Math.round((prod[res] || 0) * modifier);
    });
    return entry;
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-sm p-2 text-[10px] font-mono shadow-lg">
        <p className="text-foreground font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="text-foreground font-semibold">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DataCard
      title="Resource Production (Effective Output)"
      headerRight={
        <div className="flex gap-1">
          {["bar", "radar"].map(t => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`text-[8px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-sm ${
                chartType === t ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground border border-transparent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-[300px]">
        {chartType === "bar" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(210 8% 42%)" }} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(210 8% 42%)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {RESOURCES.map(res => (
                <Bar key={res} dataKey={res} fill={RESOURCE_COLORS[res]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(230 14% 14%)" />
              <PolarAngleAxis dataKey="resource" tick={{ fontSize: 9, fill: "hsl(210 10% 78%)" }} />
              <PolarRadiusAxis tick={{ fontSize: 8, fill: "hsl(210 8% 42%)" }} />
              {economies.map((e, i) => (
                <Radar
                  key={e.id}
                  name={e.faction_tag || "???"}
                  dataKey={e.faction_tag || e.id}
                  stroke={e.faction_color || `hsl(${i * 60}, 70%, 50%)`}
                  fill={e.faction_color || `hsl(${i * 60}, 70%, 50%)`}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="text-[9px] text-muted-foreground mt-2 font-mono">
        Effective output = base production × supply chain modifier. Low modifiers indicate disrupted supply routes.
      </p>
    </DataCard>
  );
}