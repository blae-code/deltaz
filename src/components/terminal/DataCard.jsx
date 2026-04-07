import { cn } from "@/lib/utils";

export default function DataCard({ title, children, className, headerRight }) {
  return (
    <div className={cn("panel-frame overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/60">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-2.5 bg-primary/70 shrink-0" />
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary font-display">
              {title}
            </h3>
          </div>
          {headerRight}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}