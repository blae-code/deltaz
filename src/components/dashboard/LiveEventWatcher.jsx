import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { Map, Crosshair, AlertTriangle } from "lucide-react";
import { beep, staticBurst, alertTone } from "@/lib/sfx";

const threatColors = {
  minimal: "text-status-ok",
  low: "text-status-ok",
  moderate: "text-status-warn",
  high: "text-status-danger",
  critical: "text-status-danger",
};

const statusLabels = {
  secured: "SECURED",
  contested: "CONTESTED",
  hostile: "HOSTILE",
  uncharted: "UNCHARTED",
};

const difficultyColors = {
  routine: "text-primary",
  hazardous: "text-status-warn",
  critical: "text-status-danger",
  suicide: "text-status-danger",
};

export default function LiveEventWatcher({ userEmail }) {
  const seenRef = useRef(new Set());

  useEffect(() => {
    // Watch territory status changes
    const unsubTerritory = base44.entities.Territory.subscribe((event) => {
      if (event.type !== "update") return;
      const t = event.data;
      if (!t) return;
      // Dedupe within 5s window
      const key = `territory-${event.id}-${Date.now()}`;
      if (seenRef.current.has(event.id)) return;
      seenRef.current.add(event.id);
      setTimeout(() => seenRef.current.delete(event.id), 5000);

      const statusLabel = statusLabels[t.status] || t.status?.toUpperCase();
      const threatClass = threatColors[t.threat_level] || "text-foreground";

      staticBurst();
      toast({
        title: `⚠ TERRITORY ALERT: ${t.name || "Unknown"}`,
        description: `Sector ${t.sector || "??"} status changed to ${statusLabel} — Threat: ${(t.threat_level || "unknown").toUpperCase()}`,
        duration: 8000,
      });
    });

    // Watch new missions posted
    const unsubJob = base44.entities.Job.subscribe((event) => {
      if (event.type !== "create") return;
      const j = event.data;
      if (!j) return;
      const key = `job-${event.id}`;
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      setTimeout(() => seenRef.current.delete(key), 5000);

      beep();
      toast({
        title: `📡 NEW MISSION: ${j.title || "Classified"}`,
        description: `Type: ${(j.type || "recon").toUpperCase()} — Difficulty: ${(j.difficulty || "routine").toUpperCase()} — Reward: ${j.reward_credits || 0}c`,
        duration: 8000,
      });
    });

    // Watch critical/emergency world events
    const unsubEvent = base44.entities.Event.subscribe((event) => {
      if (event.type !== "create") return;
      const e = event.data;
      if (!e) return;
      if (e.severity !== "critical" && e.severity !== "emergency") return;
      const key = `event-${event.id}`;
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      setTimeout(() => seenRef.current.delete(key), 5000);

      alertTone();
      toast({
        title: `🚨 ${e.severity === "emergency" ? "EMERGENCY" : "CRITICAL"}: ${e.title || "Unknown Threat"}`,
        description: e.content?.substring(0, 120) || "All operatives report to SITREP.",
        variant: "destructive",
        duration: 12000,
      });
    });

    // Watch broadcast notifications for this user
    const unsubNotify = base44.entities.Notification.subscribe((event) => {
      if (event.type !== "create") return;
      const n = event.data;
      if (!n) return;
      if (n.player_email !== userEmail && n.player_email !== "broadcast") return;
      const key = `notif-${event.id}`;
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      setTimeout(() => seenRef.current.delete(key), 5000);

      const isUrgent = n.priority === "high" || n.priority === "critical";
      isUrgent ? alertTone() : beep();
      toast({
        title: n.title,
        description: n.message || "",
        variant: isUrgent ? "destructive" : "default",
        duration: isUrgent ? 10000 : 6000,
      });
    });

    return () => {
      unsubTerritory();
      unsubJob();
      unsubEvent();
      unsubNotify();
    };
  }, [userEmail]);

  // This component renders nothing — it's a side-effect-only watcher
  return null;
}