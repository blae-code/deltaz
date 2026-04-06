import LiveSyncBadge from "../terminal/LiveSyncBadge";
import QueryErrorBanner from "../terminal/QueryErrorBanner";

/**
 * PageShell — Standardized page anatomy:
 *  1. Header (title + subtitle + live sync indicator)
 *  2. Error banner (if syncMeta reports error)
 *  3. Status strip (optional summary stats)
 *  4. Action rail (tabs, filters, primary actions)
 *  5. Main workspace (children)
 */
export default function PageShell({ title, subtitle, actions, statusStrip, actionRail, syncMeta, onRetry, children }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold font-display tracking-wider text-primary uppercase truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{subtitle}</p>
            )}
          </div>
          {syncMeta && (
            <LiveSyncBadge
              dataUpdatedAt={syncMeta.dataUpdatedAt}
              isFetching={syncMeta.isFetching}
              isStale={syncMeta.isStale}
              isError={syncMeta.isError}
            />
          )}
        </div>
        {actions && <div className="flex gap-1.5 flex-wrap shrink-0">{actions}</div>}
      </div>

      {/* 2. Error banner — only if syncMeta reports error */}
      {syncMeta?.isError && (
        <QueryErrorBanner
          message={syncMeta.error?.message}
          onRetry={onRetry}
        />
      )}

      {/* 3. Status strip */}
      {statusStrip && <div>{statusStrip}</div>}

      {/* 4. Action rail */}
      {actionRail && <div>{actionRail}</div>}

      {/* 5. Main workspace */}
      <div>{children}</div>
    </div>
  );
}