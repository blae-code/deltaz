import { ArrowUpDown } from "lucide-react";

const SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "rarity", label: "Rarity" },
  { key: "value", label: "Value" },
  { key: "condition", label: "Condition" },
  { key: "quantity", label: "Qty" },
  { key: "category", label: "Type" },
];

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

export function sortItems(items, sortKey, sortDir) {
  return [...items].sort((a, b) => {
    let va, vb;
    if (sortKey === "rarity") {
      va = RARITY_ORDER[a.rarity] ?? 0;
      vb = RARITY_ORDER[b.rarity] ?? 0;
    } else if (sortKey === "name" || sortKey === "category") {
      va = (a[sortKey] || "").toLowerCase();
      vb = (b[sortKey] || "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    } else {
      va = a[sortKey] ?? 0;
      vb = b[sortKey] ?? 0;
    }
    return sortDir === "asc" ? va - vb : vb - va;
  });
}

export default function InventorySorter({ sortKey, sortDir, onSort }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => {
            if (sortKey === opt.key) {
              onSort(opt.key, sortDir === "asc" ? "desc" : "asc");
            } else {
              onSort(opt.key, "desc");
            }
          }}
          className={`text-[8px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-sm border transition-colors ${
            sortKey === opt.key
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          {opt.label}
          {sortKey === opt.key && (sortDir === "asc" ? " ↑" : " ↓")}
        </button>
      ))}
    </div>
  );
}