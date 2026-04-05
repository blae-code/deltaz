import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

export default function TradeBalanceChart({ routes, factions }) {
  // Calculate net trade balance per faction
  const balanceMap = {};
  factions.forEach(f => { balanceMap[f.id] = { tag: f.tag, color: f.color, income: 0, expense: 0 }; });

  routes.filter(r => r.status !== "cancelled").forEach(r => {
    const cycleCost = (r.amount || 0) * (r.price_per_unit || 0);
    if (balanceMap[r.from_faction_id]) balanceMap[r.from_faction_id].income += cycleCost;
    if (balanceMap[r.to_faction_id]) balanceMap[r.to_faction_id].expense += cycleCost;
  });

  const data = Object.values(balanceMap)
    .map(b => ({ name: b.tag, balance: b.income - b.expense, color: b.color }))
    .filter(b => b.balance !== 0)
    .sort((a, b) => b.balance - a.balance);

  if (data.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-[10px] text-muted-foreground tracking-wider">NO TRADE BALANCE DATA</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(160 10% 50%)" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(160 10% 50%)" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "hsl(160 10% 8%)", border: "1px solid hsl(160 15% 16%)", fontSize: 11, fontFamily: "monospace" }}
          formatter={(val) => [`${val >= 0 ? "+" : ""}${val} cr/cycle`, "Balance"]}
        />
        <ReferenceLine x={0} stroke="hsl(160 15% 20%)" />
        <Bar dataKey="balance" radius={[0, 2, 2, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.balance >= 0 ? "hsl(160 100% 40%)" : "hsl(0 80% 50%)"} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}