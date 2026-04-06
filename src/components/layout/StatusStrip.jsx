/**
 * StatusStrip — A row of mini stat cells for the summary/status area.
 * Usage: <StatusStrip items={[{ label: "ACTIVE", value: 5, color: "text-primary" }, ...]} />
 */
export default function StatusStrip({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 6)}, minmax(0, 1fr))` }}>
      {items.map((item, i) => (
        <div key={i} className="border border-border bg-card rounded-sm p-3">
          <div className="text-[9px] text-muted-foreground tracking-widest uppercase">{item.label}</div>
          <div className={`text-lg font-bold font-display ${item.color || "text-foreground"}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}