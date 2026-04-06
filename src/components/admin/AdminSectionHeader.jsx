import { AlertTriangle } from "lucide-react";

/**
 * AdminSectionHeader — consistent header for admin sub-sections.
 * Includes optional risk level indicator for dangerous sections.
 */
export default function AdminSectionHeader({ icon: Icon, title, description, riskLevel }) {
  return (
    <div className="border-b border-border pb-3 mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
        <h3 className="text-xs font-mono font-semibold tracking-widest text-primary uppercase">
          {title}
        </h3>
        {riskLevel === "high" && (
          <span className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-destructive bg-destructive/10 border border-destructive/20 rounded-sm px-1.5 py-0.5">
            <AlertTriangle className="h-2.5 w-2.5" /> HIGH IMPACT
          </span>
        )}
        {riskLevel === "medium" && (
          <span className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded-sm px-1.5 py-0.5">
            <AlertTriangle className="h-2.5 w-2.5" /> CAUTION
          </span>
        )}
      </div>
      {description && (
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed max-w-xl">
          {description}
        </p>
      )}
    </div>
  );
}