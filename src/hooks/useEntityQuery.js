import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getEntityQueryPolicy } from "@/lib/entity-query-policy";

/**
 * Fetches entity data via useQuery and keeps it in sync using
 * base44 real-time subscriptions that auto-invalidate the cache.
 *
 * @param {string} key        - unique query key (e.g. "jobs", "inventory")
 * @param {Function} fetcher  - async function returning data
 * @param {Object} [opts]     - options
 * @param {string[]} [opts.subscribeEntities] - entity names to subscribe to (will invalidate this query on changes)
 * @param {Object} [opts.queryOpts] - extra options passed to useQuery
 */
export default function useEntityQuery(key, fetcher, opts = {}) {
  const queryClient = useQueryClient();
  const queryKey = Array.isArray(key) ? key : [key];
  const {
    subscribeEntities = [],
    queryOpts = {},
    syncPolicy,
    subscriptionDebounceMs: overrideSubscriptionDebounceMs,
  } = opts;
  const isEnabled = queryOpts.enabled ?? true;
  const subscribeKey = subscribeEntities.join("|");
  const { queryOptions: policyQueryOptions, subscriptionDebounceMs } = getEntityQueryPolicy(syncPolicy, {
    hasSubscriptions: subscribeEntities.length > 0,
  });
  const effectiveSubscriptionDebounceMs = overrideSubscriptionDebounceMs ?? subscriptionDebounceMs;

  const query = useQuery({
    queryKey,
    queryFn: fetcher,
    // Keep showing previous data while refetching (partial rendering)
    placeholderData: (prev) => prev,
    ...policyQueryOptions,
    ...queryOpts,
  });

  useEffect(() => {
    if (!isEnabled || subscribeEntities.length === 0) return;

    let invalidateTimer = null;

    const invalidateQuery = () => {
      queryClient.invalidateQueries({
        queryKey,
        refetchType: typeof document !== "undefined" && document.hidden ? "none" : "active",
      });
    };

    const scheduleInvalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = window.setTimeout(() => {
        invalidateTimer = null;
        invalidateQuery();
      }, effectiveSubscriptionDebounceMs);
    };

    const unsubs = subscribeEntities.map((entityName) => {
      const entity = base44.entities[entityName];
      if (!entity?.subscribe) return null;
      return entity.subscribe(scheduleInvalidate);
    });

    return () => {
      if (invalidateTimer) {
        window.clearTimeout(invalidateTimer);
      }
      unsubs.forEach((u) => u?.());
    };
  }, [queryClient, isEnabled, subscribeKey, effectiveSubscriptionDebounceMs, ...queryKey]);

  // Expose sync metadata alongside standard query fields
  return {
    ...query,
    syncMeta: {
      dataUpdatedAt: query.dataUpdatedAt,
      isFetching: query.isFetching,
      isStale: query.isStale,
      isError: query.isError,
      error: query.error,
      // True only on the very first load (no cached data yet)
      isInitialLoading: query.isLoading && !query.data,
    },
  };
}
