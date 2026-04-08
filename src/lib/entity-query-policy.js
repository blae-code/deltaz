const QUERY_POLICIES = {
  realtime: {
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    subscriptionDebounceMs: 300,
  },
  active: {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    subscriptionDebounceMs: 600,
  },
  passive: {
    staleTime: 90_000,
    refetchOnWindowFocus: true,
    refetchInterval: false,
    subscriptionDebounceMs: 900,
  },
  static: {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    subscriptionDebounceMs: 1_500,
  },
};

function getVisibleRefetchInterval(intervalMs) {
  if (!intervalMs) return false;

  return () => {
    if (typeof document !== "undefined" && document.hidden) {
      return false;
    }

    if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
      return false;
    }

    return intervalMs;
  };
}

export function getEntityQueryPolicy(syncPolicy, { hasSubscriptions = false } = {}) {
  const policyName = syncPolicy || (hasSubscriptions ? "passive" : "static");
  const resolved = QUERY_POLICIES[policyName] || QUERY_POLICIES.passive;

  return {
    queryOptions: {
      staleTime: resolved.staleTime,
      refetchOnWindowFocus: resolved.refetchOnWindowFocus,
      refetchOnReconnect: true,
      refetchInterval: getVisibleRefetchInterval(resolved.refetchInterval),
      refetchIntervalInBackground: false,
    },
    subscriptionDebounceMs: resolved.subscriptionDebounceMs,
  };
}
