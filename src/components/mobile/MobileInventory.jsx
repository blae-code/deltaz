import MobileSummaryCard from "./MobileSummaryCard";
import MobileKpiRow from "./MobileKpiRow";
import { Package, AlertTriangle, Star, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

const RARITY_COLOR = {
  common: "text-muted-foreground",
  uncommon: "text-status-ok",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-primary",
};

export default function MobileInventory({ items }) {
  const safeItems = (items || []).filter(i => i?.id && i?.name);
  const equipped = safeItems.filter(i => i.is_equipped);
  const lowCondition = safeItems.filter(i => (i.condition ?? 100) < 30);
  const totalValue = safeItems.reduce((s, i) => s + (i.value || 0) * (i.quantity || 1), 0);

  const kpis = [
    { label: "ITEMS", value: safeItems.length, color: "text-primary" },
    { label: "EQUIPPED", value: equipped.length, color: "text-accent" },
    { label: "DEGRADED", value: lowCondition.length, color: lowCondition.length ? "text-destructive" : "text-status-ok" },
    { label: "VALUE", value: `${totalValue}c`, color: "text-foreground" },
  ];

  // Show equipped first, then degraded, then rest by value
  const sorted = [...safeItems].sort((a, b) => {
    if (a.is_equipped && !b.is_equipped) return -1;
    if (!a.is_equipped && b.is_equipped) return 1;
    const aCond = a.condition ?? 100;
    const bCond = b.condition ?? 100;
    if (aCond < 30 && bCond >= 30) return -1;
    if (aCond >= 30 && bCond < 30) return 1;
    return (b.value || 0) - (a.value || 0);
  });

  return (
    <div className="space-y-4">
      <MobileKpiRow items={kpis} />

      {sorted.length === 0 ? (
        <div className="text-center py-8 text-[10px] text-muted-foreground/50 font-mono">
          GEAR LOCKER EMPTY — ADD YOUR FIRST ITEM
        </div>
      ) : (
        <div className="space-y-1.5">
          {sorted.slice(0, 20).map(item => {
            const cond = item.condition ?? 100;
            const isDegraded = cond < 30;
            return (
              <MobileSummaryCard
                key={item.id}
                icon={
                  isDegraded
                    ? <AlertTriangle className="h-4 w-4 text-destructive" />
                    : item.is_equipped
                      ? <Star className="h-4 w-4 text-primary" />
                      : <Package className="h-4 w-4" />
                }
                title={`${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`}
                subtitle={`${item.category || item.type || "gear"} · ${cond}% condition`}
                status={item.is_equipped ? "EQUIPPED" : isDegraded ? "REPAIR" : ""}
                statusColor={item.is_equipped ? "text-primary" : isDegraded ? "text-destructive" : ""}
              />
            );
          })}
          {sorted.length > 20 && (
            <div className="text-[9px] text-muted-foreground/50 text-center py-2 font-mono">
              + {sorted.length - 20} MORE ITEMS — SWITCH TO FULL VIEW
            </div>
          )}
        </div>
      )}
    </div>
  );
}