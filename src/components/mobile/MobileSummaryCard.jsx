import { cn } from "@/lib/utils";

/**
 * MobileSummaryCard — A compact, touch-friendly card for mobile command views.
 * Replaces data-table rows with a single scannable block.
 *
 * @param {ReactElement} icon - Left icon
 * @param {string} title - Primary label (one line)
 * @param {string} subtitle - Secondary info
 * @param {string} status - Status text (right side)
 * @param {string} statusColor - Tailwind text color class
 * @param {ReactElement} badge - Optional right-side badge
 * @param {string} glow - Optional glow animation class
 * @param {function} onClick - Optional tap handler
 */
export default function MobileSummaryCard({ icon, title, subtitle, status, statusColor, badge, glow, onClick, children }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "panel-frame p-3 flex items-center gap-3 transition-colors",
        onClick && "cursor-pointer hover:bg-secondary/30 active:bg-secondary/50",
        glow
      )}
    >
      {icon && <div className="shrink-0 text-muted-foreground/80">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate leading-tight">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground/80 truncate mt-0.5">{subtitle}</div>}
        {children}
      </div>
      <div className="shrink-0 text-right">
        {badge}
        {status && (
          <div className={cn("text-[10px] font-mono uppercase tracking-wider", statusColor || "text-muted-foreground")}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}