import { cn } from "@/lib/utils";

const statusColors = {
  online: "bg-primary",
  offline: "bg-muted-foreground",
  warning: "bg-accent",
  critical: "bg-destructive",
  active: "bg-primary",
  mia: "bg-accent",
  kia: "bg-destructive",
  extracted: "bg-chart-4",
};

export default function StatusIndicator({ status = "online", label, className }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-2 w-2 rounded-full pulse-glow", statusColors[status] || "bg-muted-foreground")} />
      {label && <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>}
    </div>
  );
}