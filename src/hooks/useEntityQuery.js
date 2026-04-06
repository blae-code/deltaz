import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

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
  const { subscribeEntities = [], queryOpts = {} } = opts;

  const query = useQuery({
    queryKey,
    queryFn: fetcher,
    staleTime: 30_000,
    ...queryOpts,
  });

  useEffect(() => {
    if (subscribeEntities.length === 0) return;

    const unsubs = subscribeEntities.map((entityName) => {
      const entity = base44.entities[entityName];
      if (!entity?.subscribe) return null;
      return entity.subscribe(() => {
        queryClient.invalidateQueries({ queryKey });
      });
    });

    return () => unsubs.forEach((u) => u?.());
  }, [queryClient, ...queryKey]);

  // Expose sync metadata alongside standard query fields
  return {
    ...query,
    syncMeta: {
      dataUpdatedAt: query.dataUpdatedAt,
      isFetching: query.isFetching,
      isStale: query.isStale,
      isError: query.isError,
      error: query.error,
    },
  };
}