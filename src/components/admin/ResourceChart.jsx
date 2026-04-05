import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function ResourceChart({ economies, factions }) {
  const data = economies.map((eco) => {
    const faction = factions.find((f) => f.id === eco.faction_id);
    return {
      name: faction?.tag || "???",
      wealth: eco.wealth,
      production: eco.production_rate,
      color: faction?.color || "#666",
    };
  }).sort((a, b) => b.wealth - a.wealth);

  return (
    <div className="border border-border rounded-sm p-4 bg-card">
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display mb-3">
        FACTION WEALTH OVERVIEW
      </h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(160 10% 50%)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "hsl(160 15% 16%)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(160 10% 50%)", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "hsl(160 15% 16%)" }}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(160 10% 8%)",
              border: "1px solid hsl(160 15% 16%)",
              borderRadius: 2,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
            labelStyle={{ color: "hsl(160 20% 85%)" }}
          />
          <Bar dataKey="wealth" radius={[2, 2, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}