import { cn } from "@/lib/utils";
import { CircleOff } from "lucide-react";

/**
 * EmptyState — directive empty state that answers:
 *   1. Why is this empty?
 *   2. What should I do next?
 *   3. Can the system help me start?
 *
 * @param {ReactElement} icon - Lucide icon component
 * @param {string} title - Short headline ("No missions found")
 * @param {string} why - Why it's empty ("Your filters don't match any current postings")
 * @param {string} action - What the user should do ("Try widening your filters or check back later")
 * @param {ReactNode} cta - Optional button/link to get started
 */
export default function EmptyState({ icon: Icon = CircleOff, title, why, action, cta, className }) {
  return (
    <div className={cn(
      "border border-border border-dashed rounded-sm py-8 px-6 flex flex-col items-center text-center space-y-2.5",
      className
    )}>
      <div className="h-8 w-8 rounded-sm bg-secondary/60 flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {title && (
        <p className="text-xs font-semibold text-foreground font-mono tracking-wide">{title}</p>
      )}
      {why && (
        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs">{why}</p>
      )}
      {action && (
        <p className="text-[10px] text-primary/80 leading-relaxed max-w-xs">{action}</p>
      )}
      {cta && <div className="pt-1">{cta}</div>}
    </div>
  );
}