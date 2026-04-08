/**
 * StatusStrip — Summary stat row used at the top of data-heavy pages.
 * Each cell is a panel-frame tile with chamfered corner and amber top rule.
 */
export default function StatusStrip({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item, i) => (
        <div key={i} className="panel-frame clip-corner-tr px-3 py-2.5 sm:p-3 relative">
          <div className="text-[9px] text-muted-foreground/60 tracking-[0.2em] uppercase font-mono leading-tight mb-1">
            {item.label}
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-display leading-none ${item.color || "text-foreground"}`}>
            {item.value}
          </div>
          {item.sub && (
            <div className="text-[9px] text-muted-foreground/50 font-mono mt-1">{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
