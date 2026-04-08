import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getColor(v) {
  if (v < 20) return { stroke: "hsl(0 75% 48%)",   text: "text-status-danger", bg: "bg-status-danger/10", status: "CRITICAL",  desc: "Immediate intervention required — system is failing." };
  if (v < 40) return { stroke: "hsl(38 85% 55%)",  text: "text-status-warn",   bg: "bg-status-warn/10",  status: "WARNING",   desc: "Degraded state — address soon to prevent collapse." };
  if (v < 60) return { stroke: "hsl(38 60% 55%)",  text: "text-accent",        bg: "",                   status: "MODERATE",  desc: "Below optimal — functional but room to improve." };
  return        { stroke: "hsl(32 82% 48%)",        text: "text-primary",       bg: "",                   status: "NOMINAL",   desc: "Operating within acceptable parameters." };
}

export default function ColonyGauge({ label, value, icon }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const colors = getColor(clamped);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex flex-col items-center p-2 border border-border cursor-help hover:border-primary/30 transition-colors ${colors.bg}`}>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={radius} fill="none" stroke="hsl(230 14% 14%)" strokeWidth="4" />
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
            <span className="text-[8px] text-muted-foreground tracking-widest mt-1 uppercase">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-[11px] bg-card border-primary/30 max-w-[200px]">
          <p className={`font-semibold text-[10px] mb-0.5 ${colors.text}`}>{label} — {colors.status}</p>
          <p className="text-muted-foreground mb-1">{colors.desc}</p>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 border-t border-border/40 pt-1 mt-0.5">
            <span>Current: <span className="text-foreground">{clamped}%</span></span>
            <span>· &lt;20 CRITICAL · &lt;40 WARN</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
