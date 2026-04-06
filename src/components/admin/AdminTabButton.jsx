/**
 * AdminTabButton — styled button for admin sub-tab navigation.
 * Supports optional risk coloring and counts.
 */
export default function AdminTabButton({ icon: Icon, label, active, onClick, count, risk }) {
  const riskBorder = risk === "high"
    ? "border-destructive/40"
    : risk === "medium"
    ? "border-accent/40"
    : "";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-mono uppercase tracking-wider rounded-sm border transition-colors ${
        active
          ? `border-primary bg-primary/10 text-primary ${riskBorder || "border-primary"}`
          : `border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 ${riskBorder}`
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[7px] bg-secondary rounded-sm px-1 py-0.5 ml-0.5">
          {count}
        </span>
      )}
    </button>
  );
}