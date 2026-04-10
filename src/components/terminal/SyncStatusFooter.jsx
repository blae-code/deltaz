import { useState, useEffect } from "react";
import { subscribeRegistry } from "../../hooks/useSyncRegistry";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import SignalBarsSvg from "../svg/SignalBarsSvg";

/**
 * SyncStatusFooter — replaces the static footer status with
 * real aggregated sync information from all active queries.
 */
export default function SyncStatusFooter() {
  const [entries, setEntries] = useState({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsub = subscribeRegistry(setEntries);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => { unsub(); clearInterval(tick); };
  }, []);

  const list = Object.values(entries);

  if (list.length === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <SignalBarsSvg strength={0} size={14} />
        <span className="text-[10px] text-muted-foreground/50 font-mono tracking-widest">STANDBY</span>
      </div>
    );
  }

  const anyFetching = list.some((e) => e.isFetching);
  const anyError = list.some((e) => e.isError);
  const latestUpdate = Math.max(...list.map((e) => e.dataUpdatedAt || 0));
  const age = latestUpdate > 0 ? Math.round((now - latestUpdate) / 1000) : null;
  const isVeryStale = age !== null && age > 120;

  let signalStrength = 4;
  let signalColor = "hsl(var(--status-ok))";
  let label = "LIVE";
  let Icon = Wifi;

  if (anyFetching) {
    signalStrength = 2;
    signalColor = "hsl(var(--primary))";
    label = "SYNCING";
    Icon = RefreshCw;
  } else if (anyError) {
    signalStrength = 1;
    signalColor = "hsl(var(--destructive) / 0.85)";
    label = "SYNC ERROR";
    Icon = WifiOff;
  } else if (isVeryStale) {
    signalStrength = 2;
    signalColor = "hsl(var(--status-warn))";
    label = "STALE DATA";
    Icon = AlertTriangle;
  }

  const activeCount = list.filter((e) => !e.isError).length;
  const ageStr = age !== null ? formatAge(age) : "";

  return (
    <div className="flex items-center gap-2">
      <SignalBarsSvg strength={signalStrength} size={14} animated={!anyError} activeColor={signalColor} />
      <Icon className={cn("h-2.5 w-2.5 text-muted-foreground/50", anyFetching && "animate-spin")} />
      <span className="text-[10px] text-muted-foreground/60 font-mono tracking-widest">
        {label}
      </span>
      {activeCount > 0 && (
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          · {activeCount} {activeCount === 1 ? "FEED" : "FEEDS"}
        </span>
      )}
      {ageStr && !anyFetching && (
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          · {ageStr}
        </span>
      )}
    </div>
  );
}

function formatAge(seconds) {
  if (seconds < 10) return "NOW";
  if (seconds < 60) return `${seconds}s AGO`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m AGO`;
  return `${Math.floor(mins / 60)}h AGO`;
}