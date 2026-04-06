import { CheckCircle, Circle } from "lucide-react";

const STEPS = [
  { key: "territory", label: "Select Territory" },
  { key: "squad", label: "Assign Squad" },
  { key: "configure", label: "Configure & Deploy" },
];

export default function PlannerStepIndicator({ selectedTerritory, assignedCount, hasTitle }) {
  const completedSteps = [
    !!selectedTerritory,
    assignedCount > 0,
    hasTitle,
  ];

  return (
    <div className="flex items-center gap-1 border border-border bg-card rounded-sm px-3 py-2">
      {STEPS.map((step, i) => {
        const done = completedSteps[i];
        const isCurrent = !done && (i === 0 || completedSteps[i - 1]);
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <div className={`w-6 h-px ${done ? "bg-primary" : "bg-border"}`} />
            )}
            <div className="flex items-center gap-1">
              {done ? (
                <CheckCircle className="h-3 w-3 text-primary shrink-0" />
              ) : (
                <Circle className={`h-3 w-3 shrink-0 ${isCurrent ? "text-accent" : "text-muted-foreground/40"}`} />
              )}
              <span className={`text-[9px] font-mono tracking-wider uppercase ${
                done ? "text-primary" : isCurrent ? "text-accent" : "text-muted-foreground/40"
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}