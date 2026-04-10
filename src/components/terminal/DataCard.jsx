import { cn } from "@/lib/utils";
import CornerAccentSvg from "../svg/CornerAccentSvg";

export default function DataCard({ title, subtitle, children, className, headerRight }) {
  return (
    <div className={cn("panel-frame overflow-hidden clip-corner-br relative", className)}>
      {title && (
        <div className="relative flex items-center justify-between border-b border-border/60 px-3 sm:px-4 py-2 bg-secondary/30 gap-2 overflow-hidden">
          {/* Slow luminous sweep across the header */}
          <div className="card-header-sweep" aria-hidden="true" />

          <div className="flex items-center gap-2 min-w-0 relative">
            <span className="text-primary/40 font-mono text-[10px] shrink-0 select-none">//</span>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-primary font-display truncate">
              {title}
            </h3>
          </div>

          {subtitle && !headerRight && (
            <span className="text-[9px] text-muted-foreground/60 font-mono tracking-wider shrink-0 relative">
              {subtitle}
            </span>
          )}
          {headerRight && <div className="relative">{headerRight}</div>}

          {/* Top-right corner accent bracket */}
          <div className="absolute right-0 top-0 pointer-events-none">
            <CornerAccentSvg corner="tr" size={14} />
          </div>
        </div>
      )}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}