/**
 * ActionRail — A standardized tab/filter bar for the primary action area.
 * Usage: <ActionRail tabs={[{ key, label, icon, count? }]} active={key} onChange={fn} />
 */
export default function ActionRail({ tabs, active, onChange }) {
  if (!tabs || tabs.length === 0) return null;
  return (
    <div className="flex gap-1.5 border-b border-border/70 pb-2.5 flex-wrap">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono px-3 py-2 transition-all focus-visible:ring-2 focus-visible:ring-primary/60 ${
              isActive
                ? "bg-primary/12 text-primary border border-primary/35 shadow-[inset_0_-2px_0_0_hsl(var(--primary))]"
                : "text-muted-foreground hover:text-foreground border border-transparent hover:border-border/70 hover:shadow-[inset_0_-1px_0_0_hsl(var(--border))]"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{t.label}</span>
            {t.count != null && (
              <span className="text-[10px] ml-0.5 opacity-60">({t.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}