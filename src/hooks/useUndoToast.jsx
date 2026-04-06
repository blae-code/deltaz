import { useRef, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

/**
 * useUndoToast — provides a toast with an undo button.
 * When fired, delays the real action by `delay` ms.
 * If user clicks UNDO before the timer fires, the action is cancelled.
 */
export default function useUndoToast() {
  const { toast } = useToast();
  const timerRef = useRef(null);

  const fireWithUndo = useCallback(
    ({ title, description, action, onUndo, delay = 4000 }) => {
      let cancelled = false;

      const t = toast({
        title,
        description: (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs">{description}</span>
            <button
              className="text-[10px] font-mono uppercase tracking-wider text-primary border border-primary/30 rounded-sm px-2 py-0.5 hover:bg-primary/10 shrink-0"
              onClick={() => {
                cancelled = true;
                clearTimeout(timerRef.current);
                onUndo?.();
                t.dismiss();
              }}
            >
              UNDO
            </button>
          </div>
        ),
        duration: delay + 500,
      });

      timerRef.current = setTimeout(() => {
        if (!cancelled) {
          action();
        }
      }, delay);
    },
    [toast]
  );

  return { fireWithUndo };
}