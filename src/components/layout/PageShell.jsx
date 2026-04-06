import LiveSyncBadge from "../terminal/LiveSyncBadge";

/**
 * PageShell — Standardized page anatomy:
 *  1. Header (title + subtitle + live sync indicator)
 *  2. Status strip (optional summary stats)
 *  3. Action rail (tabs, filters, primary actions)
 *  4. Main workspace (children)
 */
export default function PageShell({ title, subtitle, actions, statusStrip, actionRail, syncMeta, children }) {
  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
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
        {actions && <div className="flex gap-1.5 flex-wrap">{actions}</div>}
      </div>

      {/* 2. Status strip */}
      {statusStrip && <div>{statusStrip}</div>}

      {/* 3. Action rail */}
      {actionRail && <div>{actionRail}</div>}

      {/* 4. Main workspace */}
      <div>{children}</div>
    </div>
  );
}