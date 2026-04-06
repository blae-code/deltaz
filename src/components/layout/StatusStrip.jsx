/**
 * StatusStrip — A row of mini stat cells for the summary/status area.
 * Usage: <StatusStrip items={[{ label: "ACTIVE", value: 5, color: "text-primary" }, ...]} />
 */
export default function StatusStrip({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item, i) => (
        <div key={i} className="border border-border bg-card rounded-sm px-3 py-2.5 sm:p-3">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase leading-tight">{item.label}</div>
          <div className={`text-base sm:text-lg font-bold font-display mt-0.5 ${item.color || "text-foreground"}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}