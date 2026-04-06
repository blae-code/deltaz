import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, X, Crosshair, AlertTriangle, Check, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

const priorityStyle = {
  normal: "border-border bg-card",
  high: "border-status-warn/40 bg-status-warn/5",
  critical: "border-status-danger/40 bg-status-danger/5",
};

const priorityBadge = {
  normal: "bg-primary/20 text-primary",
  high: "bg-status-warn/20 text-status-warn",
  critical: "bg-status-danger/20 text-status-danger",
};

export default function NotificationBanner({ userEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    if (!userEmail) return;

    // Fetch both user-specific and broadcast notifications
    Promise.all([
      base44.entities.Notification.filter(
        { player_email: userEmail, is_read: false },
        "-created_date",
        10
      ),
      base44.entities.Notification.filter(
        { player_email: "broadcast", is_read: false },
        "-created_date",
        10
      ),
    ]).then(([personal, broadcasts]) => {
      const all = [...personal, ...broadcasts].sort(
        (a, b) => new Date(b.created_date) - new Date(a.created_date)
      );
      setNotifications(all);
    }).catch(() => {});

    // Subscribe to real-time notifications
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && !event.data.is_read &&
          (event.data.player_email === userEmail || event.data.player_email === "broadcast")) {
        setNotifications((prev) => [event.data, ...prev]);
      }
    });
    return unsub;
  }, [userEmail]);

  const markRead = async (id) => {
    setDismissed((prev) => new Set([...prev, id]));
    await base44.entities.Notification.update(id, { is_read: true });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllRead = async () => {
    const ids = visible.map((n) => n.id);
    setDismissed((prev) => new Set([...prev, ...ids]));
    await Promise.all(ids.map((id) => base44.entities.Notification.update(id, { is_read: true })));
    setNotifications([]);
  };

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold font-display tracking-wider text-primary uppercase">
            Incoming Transmissions ({visible.length})
          </span>
        </div>
        {visible.length > 1 && (
          <button
            onClick={markAllRead}
            className="text-[10px] text-muted-foreground hover:text-foreground tracking-wider uppercase flex items-center gap-1"
          >
            <Check className="h-3 w-3" /> MARK ALL READ
          </button>
        )}
      </div>

      {visible.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 border rounded-sm p-3 ${priorityStyle[n.priority] || priorityStyle.normal}`}
        >
          {n.type === "mission_assigned" ? (
            <Crosshair className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          ) : n.type === "diplomacy_alert" ? (
            <Swords className="h-4 w-4 text-status-danger shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground">{n.title}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider ${priorityBadge[n.priority] || priorityBadge.normal}`}>
                {n.priority}
              </span>
            </div>
            {n.message && <p className="text-[10px] text-muted-foreground mt-1">{n.message}</p>}
            <span className="text-[9px] text-muted-foreground mt-1 block">
              {moment(n.created_date).fromNow()}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
            className="text-muted-foreground hover:text-foreground shrink-0 p-1.5 -m-1 rounded-sm hover:bg-secondary/50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}