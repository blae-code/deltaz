import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EVENT_TYPES = [
  { key: "all", label: "ALL EVENTS" },
  { key: "status_change", label: "STATUS" },
  { key: "control_change", label: "CONTROL" },
  { key: "threat_change", label: "THREAT" },
];

export default function TimelineFilters({ eventFilter, sectorFilter, sectors, onEventChange, onSectorChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {EVENT_TYPES.map((t) => (
          <Button
            key={t.key}
            variant={eventFilter === t.key ? "default" : "outline"}
            size="sm"
            className="text-[9px] uppercase tracking-wider h-6 px-2"
            onClick={() => onEventChange(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <Select value={sectorFilter} onValueChange={onSectorChange}>
        <SelectTrigger className="h-7 w-32 text-[10px] font-mono bg-muted">
          <SelectValue placeholder="All sectors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ALL SECTORS</SelectItem>
          {sectors.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}