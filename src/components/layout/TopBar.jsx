import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import StatusIndicator from "../terminal/StatusIndicator";
import { Signal, Clock } from "lucide-react";

export default function TopBar() {
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d) =>
    d.toISOString().replace("T", " ").substring(0, 19) + " UTC";

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-4">
        <StatusIndicator status="online" label="SYSTEM ONLINE" />
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Signal className="h-3 w-3" />
          <span className="tracking-wider">ENCRYPTED CHANNEL</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
          <Clock className="h-3 w-3" />
          <span>{formatTime(time)}</span>
        </div>
        {user && (
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className="text-xs text-primary font-semibold tracking-wider">
              {user.callsign || user.full_name || "OPERATIVE"}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">
              [{user.role || "player"}]
            </span>
          </div>
        )}
      </div>
    </header>
  );
}