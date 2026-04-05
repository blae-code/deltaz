import { Progress } from "@/components/ui/progress";
import { Cpu, MemoryStick, HardDrive, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

export default function ServerResourceGauges({ resources }) {
  if (!resources) return null;

  const memPercent = resources.memory_limit_bytes
    ? Math.min(100, (resources.memory_bytes / resources.memory_limit_bytes) * 100)
    : 0;

  const cpuPercent = Math.min(100, resources.cpu_absolute || 0);

  const gauges = [
    {
      label: "CPU USAGE",
      icon: Cpu,
      value: `${cpuPercent.toFixed(1)}%`,
      percent: cpuPercent,
    },
    {
      label: "MEMORY",
      icon: MemoryStick,
      value: `${formatBytes(resources.memory_bytes)} / ${formatBytes(resources.memory_limit_bytes)}`,
      percent: memPercent,
    },
    {
      label: "NET IN",
      icon: ArrowDownToLine,
      value: formatBytes(resources.network_rx_bytes),
      percent: null,
    },
    {
      label: "NET OUT",
      icon: ArrowUpFromLine,
      value: formatBytes(resources.network_tx_bytes),
      percent: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {gauges.map((g) => {
        const isHigh = g.percent !== null && g.percent > 80;
        const isCritical = g.percent !== null && g.percent > 90;
        return (
          <div key={g.label} className={`border rounded-sm p-3 transition-colors ${
            isCritical ? 'border-destructive/40 bg-destructive/5' :
            isHigh ? 'border-accent/40 bg-accent/5' :
            'border-border bg-card'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <g.icon className={`h-3.5 w-3.5 ${
                isCritical ? 'text-destructive' : isHigh ? 'text-accent' : 'text-primary'
              }`} />
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider">{g.label}</span>
            </div>
            <p className={`text-sm font-bold font-mono mb-1 transition-colors ${
              isCritical ? 'text-destructive' : isHigh ? 'text-accent' : 'text-foreground'
            }`}>{g.value}</p>
            {g.percent !== null && (
              <Progress
                value={g.percent}
                className="h-1.5"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}