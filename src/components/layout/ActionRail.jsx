/**
 * ActionRail — A standardized tab/filter bar for the primary action area.
 * Usage: <ActionRail tabs={[{ key, label, icon, count? }]} active={key} onChange={fn} />
 */
export default function ActionRail({ tabs, active, onChange }) {
  if (!tabs || tabs.length === 0) return null;
  return (
    <div className="flex gap-1 border-b border-border pb-2 flex-wrap">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono px-3 py-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 ${
              active === t.key
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {t.label}
            {t.count != null && (
              <span className="text-[10px] ml-0.5 opacity-60">({t.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}