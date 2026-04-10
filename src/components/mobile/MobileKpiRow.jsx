import { cn } from "@/lib/utils";

/**
 * MobileKpiRow — Horizontal scrollable KPI row optimised for small screens.
 * Each item is a compact pill. Replaces the 4-col StatusStrip on mobile.
 *
 * @param {Array<{label: string, value: string|number, color?: string}>} items
 */
export default function MobileKpiRow({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {items.map((item, i) => (
        <div
          key={i}
          className="shrink-0 panel-frame px-3 py-2 min-w-[90px] text-center"
        >
          <div className={cn("text-lg font-bold font-display leading-none", item.color || "text-foreground")}>
            {item.value}
          </div>
          <div className="text-[8px] text-muted-foreground tracking-[0.15em] uppercase mt-1 whitespace-nowrap">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}