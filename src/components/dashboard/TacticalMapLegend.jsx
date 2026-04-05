const items = [
  { color: "bg-status-ok/40", label: "Secured" },
  { color: "bg-status-warn/40", label: "Contested" },
  { color: "bg-status-danger/40", label: "Hostile" },
  { color: "bg-muted/30", label: "Uncharted" },
];

export default function TacticalMapLegend() {
  return (
    <div className="border border-border rounded-sm p-3 bg-secondary/30 space-y-1.5">
      <p className="text-[9px] text-muted-foreground tracking-widest uppercase font-mono font-semibold mb-2">
        LEGEND
      </p>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-sm border border-border ${item.color}`} />
          <span className="text-[9px] text-muted-foreground font-mono">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1 pt-1 border-t border-border/50">
        <div className="h-2.5 w-2.5 rounded-full border border-background/50 bg-primary" />
        <span className="text-[9px] text-muted-foreground font-mono">Faction control</span>
      </div>
    </div>
  );
}