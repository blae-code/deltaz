import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * useCurrentUser — shared hook for pages that need the authenticated user.
 * Replaces the repeated pattern:
 *   const [user, setUser] = useState(null);
 *   useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
 *
 * Returns { user, loading, isAdmin }
 */
export default function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then((u) => { setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return {
    user,
    loading,
    isAdmin: user?.role === "admin",
  };
}