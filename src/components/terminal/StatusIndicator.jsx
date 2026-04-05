import { cn } from "@/lib/utils";

const statusColors = {
  online: "bg-status-ok",
  offline: "bg-muted-foreground",
  warning: "bg-status-warn",
  critical: "bg-status-danger",
  active: "bg-status-ok",
  mia: "bg-status-warn",
  kia: "bg-status-danger",
  extracted: "bg-status-info",
};

export default function StatusIndicator({ status = "online", label, className }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-2 w-2 rounded-full pulse-glow", statusColors[status] || "bg-muted-foreground")} />
      {label && <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>}
    </div>
  );
}