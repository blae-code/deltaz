import { useState } from "react";
import { Link } from "react-router-dom";
import InventoryItemCard from "./InventoryItemCard";
import InventorySorter, { sortItems } from "./InventorySorter";
import EmptyState from "../terminal/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, ArrowLeftRight } from "lucide-react";

const CATEGORIES = ["all", "weapon", "armor", "tool", "consumable", "material", "ammo", "misc"];

// SAFETY: Receives InventoryItem[]. Guards against missing/malformed records.
export default function InventoryGrid({ items: rawItems, onUpdate, userEmail }) {
  const items = Array.isArray(rawItems) ? rawItems.filter(i => i?.id && i?.name) : [];
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");

  let filtered = filter === "all" ? items : items.filter(i => i.category === filter);
  if (search) filtered = filtered.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));
  filtered = sortItems(filtered, sortKey, sortDir);
  const equipped = filtered.filter(i => i.is_equipped);
  const unequipped = filtered.filter(i => !i.is_equipped);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items..."
          className="h-8 text-[11px] bg-secondary/50 border-border font-mono pl-8"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-[10px] px-2.5 py-1.5 rounded-sm border font-mono uppercase tracking-wider transition-colors ${
              filter === cat
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/30 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sorting */}
      <InventorySorter sortKey={sortKey} sortDir={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }} />

      {/* Equipped section */}
      {equipped.length > 0 && (
        <div>
          <div className="text-[10px] text-primary tracking-widest uppercase mb-2.5 font-mono font-semibold">EQUIPPED — gear currently on your person ({equipped.length})</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {equipped.map(item => (
              <InventoryItemCard key={item.id} item={item} onUpdate={onUpdate} userEmail={userEmail} />
            ))}
          </div>
        </div>
      )}

      {/* Stash */}
      <div>
        {equipped.length > 0 && (
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2.5 font-mono font-semibold">STASH — stored items not in loadout ({unequipped.length})</div>
        )}
        {filtered.length === 0 ? (
          items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Gear Locker Empty"
              why="No items registered. Your weapons, armor, consumables, and materials will appear here once you log them."
              action="Hit ADD GEAR above to register a single item, paste a bulk list, or upload a screenshot of your in-game inventory for automatic scanning."
              cta={
                <Link to="/trade">
                  <Button variant="outline" size="sm" className="text-[10px] uppercase tracking-wider h-7">
                    <ArrowLeftRight className="h-3 w-3 mr-1" /> Browse Trade Hub
                  </Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title="No Items Match"
              why={`None of your ${items.length} items match the current category or search filter.`}
              action="Try selecting a different category tab or clearing your search."
            />
          )
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {unequipped.map(item => (
              <InventoryItemCard key={item.id} item={item} onUpdate={onUpdate} userEmail={userEmail} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}