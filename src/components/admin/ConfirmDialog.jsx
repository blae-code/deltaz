import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Shield } from "lucide-react";

/**
 * ConfirmDialog — reusable confirmation for high-stakes admin actions.
 * @param {boolean} open
 * @param {function} onOpenChange
 * @param {string} title
 * @param {string} description — what will happen
 * @param {string} impact — short impact summary (optional)
 * @param {"warning"|"danger"} severity
 * @param {string} confirmLabel
 * @param {function} onConfirm
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  impact,
  severity = "warning",
  confirmLabel = "CONFIRM",
  onConfirm,
}) {
  const isDanger = severity === "danger";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-sm font-mono tracking-wider uppercase">
            {isDanger ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Shield className="h-4 w-4 text-accent" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground font-mono leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {impact && (
          <div
            className={`border rounded-sm p-2.5 text-[10px] font-mono leading-relaxed ${
              isDanger
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-accent/30 bg-accent/5 text-accent"
            }`}
          >
            <span className="font-semibold tracking-wider uppercase">
              {isDanger ? "⚠ IMPACT:" : "IMPACT:"}
            </span>{" "}
            {impact}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="text-[10px] font-mono uppercase tracking-wider h-8">
            CANCEL
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`text-[10px] font-mono uppercase tracking-wider h-8 ${
              isDanger
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }`}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}