import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { Map, Crosshair, AlertTriangle } from "lucide-react";

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
    // Watch critical/emergency world events only (reduced noise)
    const unsubEvent = base44.entities.Event.subscribe((event) => {
      if (event.type !== "create") return;
      const e = event.data;
      if (!e) return;
      if (e.severity !== "critical" && e.severity !== "emergency") return;
      const key = `event-${event.id}`;
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      setTimeout(() => seenRef.current.delete(key), 5000);

      toast({
        title: `${e.severity === "emergency" ? "EMERGENCY" : "CRITICAL"}: ${e.title || "Unknown Threat"}`,
        description: e.content?.substring(0, 120) || "All operatives report to SITREP.",
        variant: "destructive",
        duration: 10000,
      });
    });

    return () => {
      unsubEvent();
    };
  }, [userEmail]);

  // This component renders nothing — it's a side-effect-only watcher
  return null;
}