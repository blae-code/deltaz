import { Badge } from "@/components/ui/badge";

const statusStyles = {
  allied: "bg-status-ok/15 text-status-ok border-status-ok/30",
  trade_agreement: "bg-status-info/15 text-status-info border-status-info/30",
  ceasefire: "bg-accent/15 text-accent border-accent/30",
  non_aggression: "bg-primary/15 text-primary border-primary/30",
  neutral: "bg-muted text-muted-foreground border-border",
  hostile: "bg-orange-500/15 text-orange-400 border-orange-400/30",
  war: "bg-status-danger/15 text-status-danger border-status-danger/30",
};

const statusLabels = {
  allied: "Allied",
  trade_agreement: "Trade Pact",
  ceasefire: "Ceasefire",
  non_aggression: "NAP",
  neutral: "Neutral",
  hostile: "Hostile",
  war: "At War",
};

export default function RelationsMatrix({ factions, diplomacy, onPairClick }) {
  const getRelation = (aId, bId) => {
    return diplomacy.find(
      r => (r.faction_a_id === aId && r.faction_b_id === bId) ||
           (r.faction_a_id === bId && r.faction_b_id === aId)
    );
  };

  if (factions.length < 2) {
    return <p className="text-[10px] text-muted-foreground text-center py-4">Need 2+ clans to show relations.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr>
            <th className="text-left py-1 px-2 text-muted-foreground tracking-wider">CLAN</th>
            {factions.map(f => (
              <th key={f.id} className="py-1 px-1.5 text-center">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: f.color }} />
                <span className="text-muted-foreground">{f.tag}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {factions.map(rowF => (
            <tr key={rowF.id} className="border-t border-border/50">
              <td className="py-1.5 px-2 font-semibold text-foreground whitespace-nowrap">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: rowF.color }} />
                {rowF.name}
              </td>
              {factions.map(colF => {
                if (rowF.id === colF.id) {
                  return <td key={colF.id} className="text-center py-1.5 px-1.5"><span className="text-muted-foreground/30">—</span></td>;
                }
                const rel = getRelation(rowF.id, colF.id);
                const status = rel?.status || "neutral";
                return (
                  <td key={colF.id} className="text-center py-1.5 px-1.5">
                    <button
                      onClick={() => onPairClick?.(rowF.id, colF.id, rel)}
                      className="inline-block"
                    >
                      <Badge variant="outline" className={`text-[8px] uppercase cursor-pointer hover:opacity-80 ${statusStyles[status]}`}>
                        {statusLabels[status]}
                      </Badge>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}