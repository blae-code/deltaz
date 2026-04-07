export default function ColonyGauge({ label, value, icon }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  // Color based on value
  const getColor = (v) => {
    if (v < 20) return { stroke: "hsl(0 75% 48%)", text: "text-status-danger", bg: "bg-status-danger/10" };
    if (v < 40) return { stroke: "hsl(38 85% 55%)", text: "text-status-warn", bg: "bg-status-warn/10" };
    if (v < 60) return { stroke: "hsl(38 60% 55%)", text: "text-accent", bg: "" };
    return { stroke: "hsl(32 82% 48%)", text: "text-primary", bg: "" };
  };

  const colors = getColor(clamped);

  return (
    <div className={`flex flex-col items-center p-2 rounded-sm border border-border ${colors.bg}`}>
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke="hsl(24 10% 13%)"
            strokeWidth="4"
          />
          <circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px]">{icon}</span>
          <span className={`text-xs font-bold font-display ${colors.text}`}>{clamped}</span>
        </div>
      </div>
      <span className="text-[8px] text-muted-foreground tracking-widest mt-1">{label}</span>
    </div>
  );
}