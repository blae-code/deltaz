import DataCard from "../terminal/DataCard";
import FactionSupplyCard from "./FactionSupplyCard";

export default function FactionSupplyCards({ economies }) {
  if (economies.length === 0) {
    return (
      <DataCard title="Faction Supply Status">
        <p className="text-[10px] text-muted-foreground font-mono text-center py-4">No faction economy data available.</p>
      </DataCard>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold font-display tracking-wider text-primary uppercase">
        Faction Supply Breakdown
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {economies.map(econ => (
          <FactionSupplyCard key={econ.id} econ={econ} />
        ))}
      </div>
    </div>
  );
}