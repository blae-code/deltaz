import { useState } from "react";
import InventoryItemCard from "./InventoryItemCard";

const CATEGORIES = ["all", "weapon", "armor", "tool", "consumable", "material", "ammo", "misc"];

export default function InventoryGrid({ items, onUpdate }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? items : items.filter(i => i.category === filter);
  const equipped = filtered.filter(i => i.is_equipped);
  const unequipped = filtered.filter(i => !i.is_equipped);

  return (
    <div className="space-y-3">
      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-[9px] px-2 py-1 rounded-sm border font-mono uppercase tracking-wider transition-colors ${
              filter === cat
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/30 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Equipped section */}
      {equipped.length > 0 && (
        <div>
          <div className="text-[9px] text-primary tracking-widest uppercase mb-2">EQUIPPED ({equipped.length})</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {equipped.map(item => (
              <InventoryItemCard key={item.id} item={item} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Stash */}
      <div>
        {equipped.length > 0 && (
          <div className="text-[9px] text-muted-foreground tracking-widest uppercase mb-2">STASH ({unequipped.length})</div>
        )}
        {filtered.length === 0 ? (
          <p className="text-[10px] text-muted-foreground py-4 text-center">No items in this category.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {unequipped.map(item => (
              <InventoryItemCard key={item.id} item={item} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}