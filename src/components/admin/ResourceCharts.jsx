import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function ResourceCharts({ economies, factions }) {
  const wealthData = economies.map((e) => {
    const f = factions.find((fc) => fc.id === e.faction_id);
    return { name: f?.tag || "?", wealth: e.wealth || 0, color: f?.color || "#666" };
  }).sort((a, b) => b.wealth - a.wealth);

  const productionData = economies.map((e) => {
    const f = factions.find((fc) => fc.id === e.faction_id);
    const prod = e.resource_production || {};
    const total = Object.values(prod).reduce((s, v) => s + (v || 0), 0);
    return { name: f?.tag || "?", total: Math.round(total * (e.supply_modifier || 1)), color: f?.color || "#666" };
  });

  if (economies.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-sm p-6 text-center">
        <p className="text-[10px] text-muted-foreground tracking-wider">NO ECONOMIC DATA — INITIALIZE FACTION ECONOMIES BELOW</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Wealth Bar Chart */}
      <div className="border border-border bg-card rounded-sm p-4">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display mb-3">
          FACTION WEALTH
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={wealthData}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(160 10% 50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(160 10% 50%)" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: "hsl(160 10% 8%)", border: "1px solid hsl(160 15% 16%)", fontSize: 11, fontFamily: "monospace" }}
              labelStyle={{ color: "hsl(160 100% 40%)" }}
            />
            <Bar dataKey="wealth" radius={[2, 2, 0, 0]}>
              {wealthData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Production Pie Chart */}
      <div className="border border-border bg-card rounded-sm p-4">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display mb-3">
          ADJUSTED PRODUCTION
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={productionData}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              paddingAngle={3}
              label={({ name, total }) => `${name}: ${total}`}
            >
              {productionData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.7} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "hsl(160 10% 8%)", border: "1px solid hsl(160 15% 16%)", fontSize: 11, fontFamily: "monospace" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}