import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * InlineConfirm — replaces a destructive button with a two-step confirm.
 * First click shows warning + confirm/cancel. Second click executes.
 *
 * @param {ReactNode} children — the trigger button content
 * @param {string} confirmLabel — label for the confirm button
 * @param {string} warning — short consequence text
 * @param {"warning"|"danger"} severity
 * @param {function} onConfirm
 * @param {boolean} disabled
 * @param {string} className — applied to the trigger button
 * @param {string} variant — button variant for the trigger
 */
export default function InlineConfirm({
  children,
  confirmLabel = "CONFIRM",
  warning,
  severity = "warning",
  onConfirm,
  disabled,
  className = "",
  variant = "ghost",
  size = "sm",
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    const isDanger = severity === "danger";
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {warning && (
          <div
            className={`flex items-start gap-1.5 rounded-sm px-2 py-1.5 text-[10px] font-mono leading-relaxed border ${
              isDanger
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-accent/30 bg-accent/5 text-accent"
            }`}
          >
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span>{warning}</span>
          </div>
        )}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirming(false)}
            className="h-7 text-[10px] font-mono uppercase tracking-wider flex-1"
          >
            CANCEL
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setConfirming(false);
              onConfirm?.();
            }}
            className={`h-7 text-[10px] font-mono uppercase tracking-wider flex-1 ${
              isDanger
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }`}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={() => setConfirming(true)}
    >
      {children}
    </Button>
  );
}