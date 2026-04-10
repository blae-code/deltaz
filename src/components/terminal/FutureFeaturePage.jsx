import { Lock } from "lucide-react";

/**
 * FutureFeaturePage — shown when a player navigates to a route that's planned
 * but not yet deployed. Styled as a terminal access-denied screen.
 *
 * @param {string} name    - Feature name, e.g. "WAR ROOM"
 * @param {string} description - One-line description of what it will do
 */
export default function FutureFeaturePage({ name = "FEATURE", description }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="panel-frame w-full max-w-md p-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-secondary/20">
          <span className="text-[9px] font-mono text-primary/40 tracking-[0.3em]">[ DS ] SYSTEM</span>
          <span className="text-[9px] font-mono text-muted-foreground/40 tracking-widest">MODULE STATUS</span>
        </div>

        {/* Body */}
        <div className="px-6 py-8 space-y-6 text-center">
          {/* Lock icon */}
          <div className="flex justify-center">
            <div className="h-14 w-14 border border-border/70 bg-secondary/40 flex items-center justify-center relative">
              {/* Chamfer corner decoration */}
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[10px] border-r-[10px] border-t-border/70 border-r-transparent" />
              <Lock className="h-6 w-6 text-muted-foreground/50" />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-status-danger/80 tracking-[0.35em] uppercase">
              ACCESS RESTRICTED
            </div>
            <h2 className="text-lg font-bold font-display tracking-widest text-primary uppercase">
              {name}
            </h2>
            {description && (
              <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Divider with label */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-[8px] font-mono text-muted-foreground/30 tracking-[0.3em]">PENDING DEPLOYMENT</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          {/* Message */}
          <div className="bg-secondary/30 border border-border/50 px-4 py-3 text-left space-y-1.5">
            <p className="text-[10px] text-muted-foreground/80 font-mono leading-relaxed">
              This module is scheduled for a future update cycle.
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-mono leading-relaxed">
              Check back after the next server patch.
            </p>
          </div>

          {/* Bottom tag */}
          <div className="text-[8px] font-mono text-muted-foreground/35 tracking-[0.25em] uppercase">
            DEAD SIGNAL · V1 FIELD TERMINAL
          </div>
        </div>
      </div>
    </div>
  );
}