function getGaugeColor(score) {
  if (score >= 80) return { stroke: "hsl(32, 82%, 48%)", bg: "hsl(32, 82%, 48%, 0.15)" };
  if (score >= 60) return { stroke: "hsl(38, 85%, 55%)", bg: "hsl(38, 85%, 55%, 0.15)" };
  if (score >= 40) return { stroke: "hsl(28, 80%, 50%)", bg: "hsl(28, 80%, 50%, 0.15)" };
  return { stroke: "hsl(0, 75%, 48%)", bg: "hsl(0, 75%, 48%, 0.15)" };
}

export default function PerformanceRatingGauge({ label, score, grade, summary }) {
  const colors = getGaugeColor(score);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center gap-3">
        {/* SVG Gauge */}
        <div className="relative shrink-0" style={{ width: 84, height: 84 }}>
          <svg width="84" height="84" className="-rotate-90">
            <circle
              cx="42" cy="42" r={radius}
              fill="none"
              stroke="hsl(230, 14%, 14%)"
              strokeWidth="6"
            />
            <circle
              cx="42" cy="42" r={radius}
              fill="none"
              stroke={colors.stroke}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold font-mono" style={{ color: colors.stroke }}>
              {score}
            </span>
            <span className="text-[8px] text-muted-foreground tracking-wider">{grade}</span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-foreground font-display">
            {label}
          </h4>
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{summary}</p>
        </div>
      </div>
    </div>
  );
}