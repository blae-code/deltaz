import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * QueryErrorBanner — restrained error state for failed data fetches.
 * Shows a non-intrusive banner with optional retry button.
 */
export default function QueryErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 border border-destructive/20 bg-destructive/5 rounded-sm px-3 py-2.5">
      <WifiOff className="h-4 w-4 text-destructive shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono font-semibold text-destructive uppercase tracking-wider">
          DATA FEED INTERRUPTED
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          {message || "Failed to reach the server. Data shown may be outdated. Will retry automatically."}
        </p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-7 text-[9px] font-mono border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
        >
          <RefreshCw className="h-3 w-3 mr-1" /> RETRY
        </Button>
      )}
    </div>
  );
}