import { Badge } from "@/components/ui/badge";

const PRIORITY_STYLES = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/20 text-primary border-primary/30",
  high: "bg-status-warn/20 text-status-warn border-status-warn/30",
  critical: "bg-status-danger/20 text-status-danger border-status-danger/30",
};

export default function PriorityBadge({ priority }) {
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
      {priority}
    </Badge>
  );
}