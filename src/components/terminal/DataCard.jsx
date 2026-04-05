import { cn } from "@/lib/utils";

export default function DataCard({ title, children, className, headerRight }) {
  return (
    <div className={cn("border border-border bg-card rounded-sm overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-secondary/50">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary font-display">
            {title}
          </h3>
          {headerRight}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}