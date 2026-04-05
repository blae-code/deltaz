import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import IntelCard from "../intel/IntelCard";
import DataCard from "../terminal/DataCard";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

export default function IntelHighlights() {
  const [items, setItems] = useState([]);
  const [factions, setFactions] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.IntelFeed.list("-created_date", 4),
      base44.entities.Faction.list("-created_date", 50),
    ]).then(([i, f]) => {
      setItems(i.filter((it) => it.is_active));
      setFactions(f);
    });
  }, []);

  useEffect(() => {
    const unsub = base44.entities.IntelFeed.subscribe((ev) => {
      if (ev.type === "create") {
        setItems((prev) => [ev.data, ...prev].slice(0, 4));
      }
    });
    return unsub;
  }, []);

  if (items.length === 0) return null;

  const getFaction = (id) => factions.find((f) => f.id === id)?.name;

  return (
    <DataCard
      title="GHOST PROTOCOL — Latest Intel"
      headerRight={
        <Link to="/intel" className="text-[9px] text-primary hover:underline tracking-wider flex items-center gap-1">
          <Eye className="h-3 w-3" /> VIEW ALL
        </Link>
      }
    >
      <div className="space-y-1 divide-y divide-border/50">
        {items.map((item) => (
          <IntelCard key={item.id} item={item} factionName={getFaction(item.related_faction_id)} compact />
        ))}
      </div>
    </DataCard>
  );
}