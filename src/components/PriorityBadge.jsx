import { Badge } from "@/components/ui/badge";

const PRIORITY_STYLES = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  high: "bg-threat-orange/20 text-threat-orange border-threat-orange/30",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function PriorityBadge({ priority }) {
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
      {priority}
    </Badge>
  );
}