import { Sword, Shield, Wrench, Apple, Box } from "lucide-react";

const catIcons = {
  weapon: Sword,
  armor: Shield,
  tool: Wrench,
  consumable: Apple,
};

export default function InventoryStats({ items }) {
  const equipped = items.filter(i => i.is_equipped).length;
  const totalValue = items.reduce((s, i) => s + (i.value || 0) * (i.quantity || 1), 0);
  const categories = {};
  items.forEach(i => { categories[i.category] = (categories[i.category] || 0) + (i.quantity || 1); });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="border border-border bg-card rounded-sm p-3">
        <div className="text-[9px] text-muted-foreground tracking-wider">TOTAL ITEMS</div>
        <div className="text-xl font-bold font-display text-primary">{items.reduce((s, i) => s + (i.quantity || 1), 0)}</div>
      </div>
      <div className="border border-border bg-card rounded-sm p-3">
        <div className="text-[9px] text-muted-foreground tracking-wider">EQUIPPED</div>
        <div className="text-xl font-bold font-display text-accent">{equipped}</div>
      </div>
      <div className="border border-border bg-card rounded-sm p-3">
        <div className="text-[9px] text-muted-foreground tracking-wider">TOTAL VALUE</div>
        <div className="text-xl font-bold font-display text-foreground">{totalValue}c</div>
      </div>
      <div className="border border-border bg-card rounded-sm p-3">
        <div className="text-[9px] text-muted-foreground tracking-wider">CATEGORIES</div>
        <div className="flex gap-2 mt-1 flex-wrap">
          {Object.entries(categories).map(([cat, count]) => (
            <span key={cat} className="text-[9px] text-muted-foreground">
              {cat}: {count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}