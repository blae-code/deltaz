import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import DataCard from "../terminal/DataCard";

const RESOURCE_TYPES = ["fuel", "metals", "tech", "food", "munitions"];

const RESOURCE_COLORS = {
  fuel: "#d4a13a",
  metals: "#8b8b8b",
  tech: "#c8935b",
  food: "#4ade80",
  munitions: "#c53030",
};

export default function StockpileChart({ factions, factionResources, economyByFaction }) {
  const chartData = useMemo(() => {
    return factions
      .filter((f) => factionResources[f.id])
      .map((f) => {
        const res = factionResources[f.id];
        const econ = economyByFaction[f.id];
        const prod = econ?.resource_production || {};
        const modifier = econ?.supply_chain_modifier || 1;

        // Territory resource zones + production output combined
        const row = { name: f.tag || f.name?.substring(0, 6) };
        RESOURCE_TYPES.forEach((r) => {
          const zoneCount = res[r] || 0;
          const prodVal = (prod[r] || 0) * modifier;
          row[r] = Math.round((zoneCount * 10 + prodVal) * 10) / 10;
        });
        row._color = f.color;
        return row;
      })
      .sort((a, b) => {
        const totalA = RESOURCE_TYPES.reduce((s, r) => s + (a[r] || 0), 0);
        const totalB = RESOURCE_TYPES.reduce((s, r) => s + (b[r] || 0), 0);
        return totalB - totalA;
      });
  }, [factions, factionResources, economyByFaction]);

  if (chartData.length === 0) {
    return (
      <DataCard title="Faction Stockpile Levels">
        <p className="text-xs text-muted-foreground text-center py-6">No faction economy data available.</p>
      </DataCard>
    );
  }

  return (
    <DataCard title="Faction Stockpile Levels">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 14% 14%)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(210 10% 60%)", fontSize: 10, fontFamily: "monospace" }}
              stroke="hsl(230 14% 14%)"
            />
            <YAxis
              tick={{ fill: "hsl(210 10% 60%)", fontSize: 9, fontFamily: "monospace" }}
              stroke="hsl(230 14% 14%)"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(230 18% 7%)",
                border: "1px solid hsl(230 14% 14%)",
                borderRadius: "2px",
                fontFamily: "monospace",
                fontSize: 11,
              }}
              labelStyle={{ color: "hsl(32 82% 48%)", fontWeight: "bold" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }}
            />
            {RESOURCE_TYPES.map((r) => (
              <Bar
                key={r}
                dataKey={r}
                name={r.toUpperCase()}
                fill={RESOURCE_COLORS[r]}
                radius={[2, 2, 0, 0]}
                maxBarSize={32}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[8px] text-muted-foreground mt-2 text-center">
        Stockpile = (Territory zones × 10) + (Production output × supply modifier)
      </p>
    </DataCard>
  );
}