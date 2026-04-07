import { cn } from "@/lib/utils";

export default function DataCard({ title, subtitle, children, className, headerRight }) {
  return (
    <div className={cn("panel-frame overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-2.5 bg-secondary/50 gap-2">
          <h3 className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-primary font-display truncate">
            {title}
          </h3>
          {subtitle && !headerRight && (
            <span className="text-[9px] text-muted-foreground font-mono truncate">{subtitle}</span>
          )}
          {headerRight}
        </div>
      )}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}