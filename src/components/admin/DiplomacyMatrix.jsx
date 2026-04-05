import { Badge } from "@/components/ui/badge";

const statusStyles = {
  neutral: "bg-muted text-muted-foreground",
  allied: "bg-primary/20 text-primary border-primary/30",
  trade_agreement: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  ceasefire: "bg-accent/20 text-accent border-accent/30",
  hostile: "bg-destructive/20 text-destructive border-destructive/30",
  war: "bg-destructive/30 text-destructive border-destructive/50 font-bold",
};

const statusLabels = {
  neutral: "NEU",
  allied: "ALY",
  trade_agreement: "TRD",
  ceasefire: "CFR",
  hostile: "HTL",
  war: "WAR",
};

export default function DiplomacyMatrix({ factions, relations }) {
  const getStatus = (aId, bId) => {
    const rel = relations.find(
      (r) =>
        (r.faction_a_id === aId && r.faction_b_id === bId) ||
        (r.faction_a_id === bId && r.faction_b_id === aId)
    );
    return rel?.status || "neutral";
  };

  if (factions.length === 0) {
    return <p className="text-[10px] text-muted-foreground">No active clans found.</p>;
  }

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          DIPLOMATIC MATRIX
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-border">
              <th className="p-2 text-left text-muted-foreground tracking-wider">CLAN</th>
              {factions.map((f) => (
                <th key={f.id} className="p-2 text-center" style={{ color: f.color }}>
                  {f.tag}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {factions.map((row) => (
              <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20">
                <td className="p-2 font-semibold" style={{ color: row.color }}>
                  {row.tag}
                </td>
                {factions.map((col) => {
                  if (row.id === col.id) {
                    return (
                      <td key={col.id} className="p-2 text-center">
                        <span className="text-[8px] text-muted-foreground/40">—</span>
                      </td>
                    );
                  }
                  const status = getStatus(row.id, col.id);
                  return (
                    <td key={col.id} className="p-2 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[8px] px-1.5 py-0 ${statusStyles[status] || ""}`}
                      >
                        {statusLabels[status] || status}
                      </Badge>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-border/50 flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <Badge variant="outline" className={`text-[7px] px-1 py-0 ${statusStyles[key]}`}>
              {label}
            </Badge>
            <span className="text-[8px] text-muted-foreground capitalize">{key.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}