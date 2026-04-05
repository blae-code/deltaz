import { Wifi, WifiOff, Clock, User } from "lucide-react";
import { useState, useEffect } from "react";

export default function StatusBar({ user }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });

  return (
    <div className="h-8 bg-card border-t border-border flex items-center justify-between px-4 font-mono text-[10px] text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <Wifi className="w-3 h-3 text-primary" />
          <span className="text-primary">CONNECTED</span>
        </span>
        <span>SYS:NOMINAL</span>
        <span>ENC:AES-256</span>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {user.full_name || user.email}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {dateStr} {timeStr}
        </span>
      </div>
    </div>
  );
}