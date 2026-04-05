import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const RESOURCE_COLORS = {
  fuel: "hsl(35, 100%, 50%)",
  metals: "hsl(200, 80%, 50%)",
  tech: "hsl(280, 60%, 50%)",
  food: "hsl(120, 60%, 45%)",
  munitions: "hsl(0, 80%, 50%)",
};

export default function ResourceProductionChart({ economies, factions }) {
  const data = economies.map((eco) => {
    const faction = factions.find((f) => f.id === eco.faction_id);
    const prod = eco.resource_production || {};
    const mod = eco.supply_chain_modifier || 1;
    return {
      name: faction?.tag || "???",
      fuel: Math.round((prod.fuel || 0) * mod),
      metals: Math.round((prod.metals || 0) * mod),
      tech: Math.round((prod.tech || 0) * mod),
      food: Math.round((prod.food || 0) * mod),
      munitions: Math.round((prod.munitions || 0) * mod),
    };
  });

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fill: "hsl(160,20%,50%)", fontSize: 10, fontFamily: "monospace" }} />
          <YAxis tick={{ fill: "hsl(160,20%,50%)", fontSize: 10, fontFamily: "monospace" }} />
          <Tooltip
            contentStyle={{
              background: "hsl(160,10%,8%)",
              border: "1px solid hsl(160,15%,16%)",
              borderRadius: 2,
              fontFamily: "monospace",
              fontSize: 11,
            }}
          />
          <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 10 }} />
          {Object.entries(RESOURCE_COLORS).map(([key, color]) => (
            <Bar key={key} dataKey={key} fill={color} stackId="a" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}