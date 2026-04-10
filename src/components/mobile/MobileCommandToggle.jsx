import { Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MobileCommandToggle — Pill switch shown at the top of pages that offer a
 * condensed "Mobile Command" view optimised for quick field decisions.
 */
export default function MobileCommandToggle({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-sm border border-border bg-card/60 w-fit">
      <button
        onClick={() => onChange(false)}
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-sm transition-colors",
          !active
            ? "bg-primary/10 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground border border-transparent"
        )}
      >
        <Monitor className="h-3 w-3" />
        <span className="hidden sm:inline">Full</span>
      </button>
      <button
        onClick={() => onChange(true)}
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-sm transition-colors",
          active
            ? "bg-primary/10 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground border border-transparent"
        )}
      >
        <Smartphone className="h-3 w-3" />
        <span className="hidden sm:inline">Command</span>
      </button>
    </div>
  );
}