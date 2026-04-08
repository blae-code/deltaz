import { cn } from "@/lib/utils";

export default function DataCard({ title, subtitle, children, className, headerRight }) {
  return (
    <div className={cn("panel-frame overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border/60 px-3 sm:px-4 py-2 bg-secondary/30 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-primary/30 font-mono text-[10px] shrink-0 select-none">//</span>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-primary font-display truncate">
              {title}
            </h3>
          </div>
          {subtitle && !headerRight && (
            <span className="text-[9px] text-muted-foreground/50 font-mono tracking-wider shrink-0">{subtitle}</span>
          )}
          {headerRight}
        </div>
      )}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}
