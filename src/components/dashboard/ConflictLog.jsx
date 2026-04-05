import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, Clock, ChevronRight, AlertTriangle } from "lucide-react";
import moment from "moment";

const STATUS_LABEL = {
  secured: "SECURED",
  contested: "CONTESTED",
  hostile: "HOSTILE",
  uncharted: "UNCHARTED",
};

const STATUS_COLOR = {
  secured: "text-status-ok",
  contested: "text-status-warn",
  hostile: "text-status-danger",
  uncharted: "text-muted-foreground",
};

const STATUS_BG = {
  secured: "bg-status-ok/10 border-status-ok/30",
  contested: "bg-status-warn/10 border-status-warn/30",
  hostile: "bg-status-danger/10 border-status-danger/30",
  uncharted: "bg-muted/30 border-border",
};

// Determine escalation direction
function getEscalation(from, to) {
  const order = ["uncharted", "secured", "contested", "hostile"];
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  if (ti > fi) return "escalation";
  if (ti < fi) return "de-escalation";
  return "lateral";
}

export default function ConflictLog() {
  const [changes, setChanges] = useState([]);
  const [factions, setFactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const seenRef = useRef(new Set());

  useEffect(() => {
    // Load territories updated in last 24h + factions for names
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      base44.entities.Territory.list("-updated_date", 100),
      base44.entities.Faction.list("name", 50),
    ]).then(([territories, facs]) => {
      setFactions(facs);
      // Filter to those updated in last 24h
      const recent = territories.filter(t => t.updated_date && t.updated_date >= cutoff);
      // Build change entries from territory data
      const entries = recent.map(t => ({
        id: t.id,
        name: t.name,
        sector: t.sector,
        status: t.status,
        threat_level: t.threat_level,
        controlling_faction_id: t.controlling_faction_id,
        updated_date: t.updated_date,
      })).sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
      setChanges(entries);
    }).finally(() => setLoading(false));

    // Subscribe to real-time territory updates
    const unsub = base44.entities.Territory.subscribe((event) => {
      if (event.type !== "update") return;
      const t = event.data;
      if (!t) return;
      if (seenRef.current.has(event.id + event.data?.updated_date)) return;
      seenRef.current.add(event.id + event.data?.updated_date);
      setTimeout(() => seenRef.current.delete(event.id + event.data?.updated_date), 5000);

      setChanges(prev => [{
        id: t.id,
        name: t.name,
        sector: t.sector,
        status: t.status,
        threat_level: t.threat_level,
        controlling_faction_id: t.controlling_faction_id,
        updated_date: t.updated_date || new Date().toISOString(),
        isNew: true,
      }, ...prev.filter(c => c.id !== t.id)]);
    });

    return unsub;
  }, []);

  const getFactionName = (id) => {
    if (!id) return "Uncontrolled";
    const f = factions.find(f => f.id === id);
    return f ? `${f.tag} ${f.name}` : "Unknown";
  };

  const getFactionColor = (id) => {
    const f = factions.find(f => f.id === id);
    return f?.color || "#666";
  };

  // Aggregate stats
  const hostileCount = changes.filter(c => c.status === "hostile").length;
  const contestedCount = changes.filter(c => c.status === "contested").length;
  const securedCount = changes.filter(c => c.status === "secured").length;

  if (loading) {
    return <div className="text-[10px] text-primary animate-pulse font-mono py-4 text-center">SCANNING CONFLICT DATA...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-status-danger" />
          <span className="text-[9px] font-mono text-muted-foreground">{hostileCount} HOSTILE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-status-warn" />
          <span className="text-[9px] font-mono text-muted-foreground">{contestedCount} CONTESTED</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-status-ok" />
          <span className="text-[9px] font-mono text-muted-foreground">{securedCount} SECURED</span>
        </div>
        <span className="text-[8px] font-mono text-muted-foreground/50 ml-auto">
          LAST 24H • {changes.length} CHANGES
        </span>
      </div>

      {/* Change feed */}
      {changes.length === 0 ? (
        <div className="border border-border border-dashed rounded-sm p-6 text-center">
          <Shield className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground font-mono">No territory changes in the last 24 hours. All quiet on the front.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
          {changes.map((change) => {
            const threatColor = change.threat_level === "critical" || change.threat_level === "high"
              ? "text-status-danger"
              : change.threat_level === "moderate"
                ? "text-status-warn"
                : "text-status-ok";

            return (
              <div
                key={change.id + change.updated_date}
                className={`border rounded-sm px-3 py-2 transition-all ${STATUS_BG[change.status] || "border-border bg-card"} ${change.isNew ? "ring-1 ring-primary/40" : ""}`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Territory name & sector */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-mono font-semibold text-foreground truncate">
                      {change.name || "Unknown"}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground">[{change.sector || "??"}]</span>
                  </div>

                  {/* Status badge */}
                  <Badge variant="outline" className={`text-[7px] px-1.5 py-0 ml-auto ${STATUS_COLOR[change.status] || ""}`}>
                    {STATUS_LABEL[change.status] || change.status?.toUpperCase()}
                  </Badge>

                  {/* Threat level */}
                  <span className={`text-[8px] font-mono uppercase tracking-wider ${threatColor}`}>
                    {change.threat_level || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-[8px] font-mono text-muted-foreground">
                  {/* Faction control */}
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: getFactionColor(change.controlling_faction_id) }} />
                    <span>{getFactionName(change.controlling_faction_id)}</span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{moment(change.updated_date).fromNow()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}