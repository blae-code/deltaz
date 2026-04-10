import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Check, X, Crosshair, Swords, AlertTriangle, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { cn } from "@/lib/utils";

const TYPE_ICON = {
  mission_assigned: Crosshair,
  mission_update: Crosshair,
  diplomacy_alert: Swords,
  colony_alert: Radio,
  system_alert: AlertTriangle,
  reputation_change: AlertTriangle,
};

const PRIORITY_DOT = {
  normal: "bg-primary",
  high: "bg-status-warn",
  critical: "bg-status-danger animate-pulse",
};

export default function NotificationDropdown({ userEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!userEmail) return;

    Promise.all([
      base44.entities.Notification.filter({ player_email: userEmail, is_read: false }, "-created_date", 15),
      base44.entities.Notification.filter({ player_email: "broadcast", is_read: false }, "-created_date", 5),
    ]).then(([personal, broadcasts]) => {
      const all = [...personal, ...broadcasts].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setNotifications(all.slice(0, 15));
    }).catch(() => {});

    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && !event.data.is_read &&
        (event.data.player_email === userEmail || event.data.player_email === "broadcast")) {
        setNotifications((prev) => [event.data, ...prev].slice(0, 15));
      }
    });
    return unsub;
  }, [userEmail]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await base44.entities.Notification.update(id, { is_read: true });
  };

  const markAllRead = async () => {
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    await Promise.all(ids.map((id) => base44.entities.Notification.update(id, { is_read: true })));
  };

  const count = notifications.length;

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex items-center justify-center h-8 w-8 border transition-colors",
          open
            ? "border-primary/50 bg-primary/10 text-primary shadow-[inset_0_-2px_0_0_hsl(var(--primary))]"
            : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
        )}
      >
        <Bell className="h-3.5 w-3.5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-[16px] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 max-h-[420px] overflow-y-auto panel-frame shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30 sticky top-0 z-10">
            <span className="text-[10px] font-semibold font-display tracking-widest text-primary uppercase">
              Transmissions {count > 0 && `(${count})`}
            </span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[9px] text-muted-foreground hover:text-primary tracking-wider uppercase flex items-center gap-1 px-1.5 py-0.5 hover:bg-primary/10 transition-colors"
                >
                  <Check className="h-3 w-3" /> CLEAR ALL
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Entries */}
          {count === 0 ? (
            <div className="px-3 py-6 text-center">
              <Bell className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[10px] text-muted-foreground">No unread transmissions</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] || AlertTriangle;
                const priority = n.priority || "normal";
                return (
                  <div key={n.id} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-secondary/20 hover:shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.35)] transition-all">
                    <div className="mt-0.5 shrink-0 relative">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {priority !== "normal" && (
                        <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{n.title}</p>
                      {n.message && (
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <span className="text-[9px] text-muted-foreground/50 mt-0.5 block">{moment(n.created_date).fromNow()}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      className="text-muted-foreground/60 hover:text-foreground shrink-0 p-1.5 hover:bg-secondary/50 transition-colors"
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}