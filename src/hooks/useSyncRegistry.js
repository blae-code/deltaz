import { useEffect, useCallback } from "react";

/**
 * Global sync registry — pages register their query sync states,
 * and the footer/topbar reads from it to show aggregated live status.
 *
 * This is intentionally a simple module-level store (not React context)
 * so it works across the component tree without a provider.
 */

let _entries = {};
let _listeners = [];

function notify() {
  _listeners.forEach((fn) => fn({ ..._entries }));
}

/** Register or update a sync entry. Call on every render with fresh data. */
export function registerSync(id, meta) {
  _entries[id] = { ...meta, id };
  notify();
}

/** Remove a sync entry (on unmount). */
export function unregisterSync(id) {
  delete _entries[id];
  notify();
}

/** Subscribe to registry changes. Returns unsubscribe fn. */
export function subscribeRegistry(fn) {
  _listeners.push(fn);
  fn({ ..._entries });
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

/**
 * Hook for pages — registers a query's sync state and auto-cleans on unmount.
 * @param {string} id - unique page/query identifier
 * @param {object} queryResult - the object returned by useEntityQuery
 */
export function useRegisterSync(id, queryResult) {
  const { dataUpdatedAt, isFetching, isStale, isError, error } = queryResult || {};

  useEffect(() => {
    registerSync(id, {
      dataUpdatedAt: dataUpdatedAt || 0,
      isFetching: !!isFetching,
      isStale: !!isStale,
      isError: !!isError,
      errorMessage: isError ? error?.message : null,
      updatedAgo: dataUpdatedAt ? Date.now() - dataUpdatedAt : null,
    });
  }, [id, dataUpdatedAt, isFetching, isStale, isError]);

  useEffect(() => {
    return () => unregisterSync(id);
  }, [id]);
}