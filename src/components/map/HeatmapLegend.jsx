export default function HeatmapLegend() {
  const levels = [
    { label: "MINIMAL", range: "0-14", color: "rgba(45, 212, 160, 0.3)" },
    { label: "LOW", range: "15-29", color: "rgba(45, 212, 160, 0.6)" },
    { label: "MODERATE", range: "30-49", color: "rgba(212, 161, 58, 0.7)" },
    { label: "HIGH", range: "50-69", color: "rgba(196, 123, 42, 0.8)" },
    { label: "CRITICAL", range: "70+", color: "rgba(197, 48, 48, 0.85)" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[9px] text-muted-foreground tracking-wider">THREAT:</span>
      {levels.map(l => (
        <div key={l.label} className="flex items-center gap-1">
          <span
            className="h-2.5 w-5 rounded-sm border border-border"
            style={{ backgroundColor: l.color }}
          />
          <span className="text-[8px] text-muted-foreground">{l.label}</span>
        </div>
      ))}
    </div>
  );
}