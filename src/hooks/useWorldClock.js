import { useEffect, useState } from "react";
import { buildWorldClockSnapshot } from "@/lib/world-state";

export default function useWorldClock(conditions) {
  const [now, setNow] = useState(() => Date.now());
  const snapshot = buildWorldClockSnapshot(conditions, now);

  useEffect(() => {
    if (!snapshot.isTicking) {
      setNow(Date.now());
      return undefined;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    snapshot.isTicking,
    conditions?.id,
    conditions?.clock_observed_at,
    conditions?.last_verified_at,
    conditions?.world_day_number,
    conditions?.world_minute_of_day,
    conditions?.clock_rate_multiplier,
  ]);

  return snapshot;
}
