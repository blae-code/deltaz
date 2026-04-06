import { AlertTriangle } from "lucide-react";

/**
 * SchemaWarningBanner — visual isolation for forms where frontend values
 * may not match backend entity schema expectations.
 * Shown above forms to alert GMs that the form may need backend verification.
 */
export default function SchemaWarningBanner({ message }) {
  return (
    <div className="flex items-start gap-2 border border-accent/30 bg-accent/5 rounded-sm px-3 py-2 mb-3">
      <AlertTriangle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-mono font-semibold text-accent uppercase tracking-wider">
          Schema Mismatch Warning
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
          {message || "This form may use field names or values that differ from the backend entity schema. Verify data appears correctly after submission."}
        </p>
      </div>
    </div>
  );
}