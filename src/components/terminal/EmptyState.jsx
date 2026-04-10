import { cn } from "@/lib/utils";
import { CircleOff } from "lucide-react";
import CornerAccentSvg from "../svg/CornerAccentSvg";

/**
 * EmptyState — directive empty state that answers:
 *   1. Why is this empty?
 *   2. What should I do next?
 *   3. Can the system help me start?
 */
export default function EmptyState({ icon: Icon = CircleOff, title, why, action, cta, className }) {
  return (
    <div className={cn(
      "relative border border-dashed border-border/40 py-8 sm:py-10 px-4 sm:px-6 flex flex-col items-center text-center space-y-3",
      className
    )}>
      {/* SVG corner bracket decorations */}
      <div className="absolute top-0 left-0 pointer-events-none"><CornerAccentSvg corner="tl" size={14} /></div>
      <div className="absolute top-0 right-0 pointer-events-none"><CornerAccentSvg corner="tr" size={14} /></div>
      <div className="absolute bottom-0 left-0 pointer-events-none"><CornerAccentSvg corner="bl" size={14} /></div>
      <div className="absolute bottom-0 right-0 pointer-events-none"><CornerAccentSvg corner="br" size={14} /></div>

      {/* Icon */}
      <div className="h-10 w-10 bg-secondary/50 border border-border/60 flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground/60" />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        {title && (
          <p className="text-[11px] font-semibold text-muted-foreground font-mono tracking-widest uppercase">{title}</p>
        )}
        {why && (
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed max-w-sm">{why}</p>
        )}
        {action && (
          <p className="text-[10px] text-primary/70 leading-relaxed max-w-xs font-mono">{action}</p>
        )}
      </div>

      {cta && <div className="pt-1">{cta}</div>}
    </div>
  );
}