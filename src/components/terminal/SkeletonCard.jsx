import { cn } from "@/lib/utils";

/**
 * SkeletonCard — animated placeholder mimicking real card shapes.
 * variant: "mission" | "inventory" | "project" | "default"
 */
export default function SkeletonCard({ variant = "default", className }) {
  return (
    <div className={cn("border border-border/50 bg-card rounded-sm overflow-hidden animate-pulse", className)}>
      {variant === "mission" && (
        <div className="px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 rounded-sm bg-secondary" />
            <div className="h-3.5 w-40 rounded-sm bg-secondary" />
            <div className="h-3 w-16 rounded-sm bg-secondary/60 ml-auto" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-14 rounded-sm bg-secondary/70" />
            <div className="h-4 w-16 rounded-sm bg-secondary/50" />
            <div className="h-2 w-2 rounded-full bg-secondary/40" />
            <div className="h-3 w-20 rounded-sm bg-secondary/40" />
          </div>
        </div>
      )}

      {variant === "inventory" && (
        <div className="p-2.5 space-y-2">
          <div className="flex items-start gap-2">
            <div className="h-7 w-7 rounded-sm bg-secondary" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded-sm bg-secondary" />
              <div className="flex gap-1.5">
                <div className="h-3 w-14 rounded-sm bg-secondary/60" />
                <div className="h-3 w-10 rounded-sm bg-secondary/40" />
              </div>
            </div>
          </div>
          <div className="h-1 w-full rounded-full bg-secondary/40" />
          <div className="flex gap-1">
            <div className="h-6 flex-1 rounded-sm bg-secondary/30" />
            <div className="h-6 w-6 rounded-sm bg-secondary/30" />
            <div className="h-6 w-6 rounded-sm bg-secondary/30" />
            <div className="h-6 w-6 rounded-sm bg-secondary/30" />
          </div>
        </div>
      )}

      {variant === "project" && (
        <div className="px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-32 rounded-sm bg-secondary" />
            <div className="h-3 w-16 rounded-sm bg-secondary/60" />
            <div className="h-3 w-14 rounded-sm bg-secondary/50" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-secondary/40" />
            <div className="h-3 w-8 rounded-sm bg-secondary/30" />
          </div>
        </div>
      )}

      {variant === "stat" && (
        <div className="p-3 space-y-2">
          <div className="h-2 w-16 rounded-sm bg-secondary/60" />
          <div className="h-5 w-10 rounded-sm bg-secondary/80" />
        </div>
      )}

      {variant === "default" && (
        <div className="p-4 space-y-2">
          <div className="h-3 w-3/4 rounded-sm bg-secondary" />
          <div className="h-3 w-1/2 rounded-sm bg-secondary/60" />
          <div className="h-3 w-2/3 rounded-sm bg-secondary/40" />
        </div>
      )}
    </div>
  );
}