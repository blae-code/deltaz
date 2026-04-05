import DataCard from "../terminal/DataCard";
import { Shield, Map, Crosshair, TrendingUp } from "lucide-react";

export default function DossierSummaryCard({ faction, territories, recentJobs, economy }) {
  if (!faction) return null;

  const completed = recentJobs.filter(j => j.status === "completed").length;
  const failed = recentJobs.filter(j => j.status === "failed").length;
  const rate = recentJobs.length > 0 ? ((completed / recentJobs.length) * 100).toFixed(0) : "N/A";

  const stats = [
    { label: "TERRITORIES", value: territories.length, icon: Map, color: "text-primary" },
    { label: "MISSIONS (7D)", value: recentJobs.length, icon: Crosshair, color: "text-accent" },
    { label: "SUCCESS RATE", value: rate === "N/A" ? rate : `${rate}%`, icon: TrendingUp, color: parseInt(rate) >= 70 ? "text-status-ok" : "text-status-danger" },
    { label: "WEALTH", value: `${(economy?.wealth || 0).toLocaleString()}c`, icon: Shield, color: "text-primary" },
  ];

  return (
    <DataCard title={`${faction.name} — Preview`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-secondary/50 rounded-sm p-3 text-center">
            <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-[9px] text-muted-foreground font-mono tracking-wider">{s.label}</p>
            <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </DataCard>
  );
}