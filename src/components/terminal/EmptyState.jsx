import { cn } from "@/lib/utils";
import { CircleOff } from "lucide-react";

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
      {/* Corner bracket decorations */}
      <span className="absolute top-2 left-2 text-[10px] font-mono text-primary/20 select-none leading-none">[</span>
      <span className="absolute top-2 right-2 text-[10px] font-mono text-primary/20 select-none leading-none">]</span>
      <span className="absolute bottom-2 left-2 text-[10px] font-mono text-primary/20 select-none leading-none">[</span>
      <span className="absolute bottom-2 right-2 text-[10px] font-mono text-primary/20 select-none leading-none">]</span>

      {/* Icon */}
      <div className="h-10 w-10 rounded-sm bg-secondary/40 border border-border/50 flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        {title && (
          <p className="text-[11px] font-semibold text-muted-foreground font-mono tracking-widest uppercase">{title}</p>
        )}
        {why && (
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-sm">{why}</p>
        )}
        {action && (
          <p className="text-[10px] text-primary/60 leading-relaxed max-w-xs font-mono">{action}</p>
        )}
      </div>

      {cta && <div className="pt-1">{cta}</div>}
    </div>
  );
}
