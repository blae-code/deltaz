import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, Package, Crosshair, Shield, Radio } from "lucide-react";

const threatColor = {
  minimal: "text-status-ok",
  low: "text-status-ok",
  moderate: "text-status-warn",
  high: "text-status-danger",
  critical: "text-status-danger",
};

const statusColor = {
  secured: "bg-status-ok/10 text-status-ok border-status-ok/20",
  contested: "bg-status-warn/10 text-status-warn border-status-warn/20",
  hostile: "bg-status-danger/10 text-status-danger border-status-danger/20",
  uncharted: "bg-muted text-muted-foreground",
};

export default function SectorDetailPanel({ sector, territories, markers, events, jobs, factions }) {
  if (!sector) return null;

  const sectorTerritories = territories.filter(t => t.sector === sector);
  const sectorMarkers = markers.filter(m => m.sector === sector);
  const sectorJobs = jobs.filter(j => {
    const t = territories.find(t => t.id === j.territory_id);
    return t?.sector === sector;
  });
  const recentEvents = events.filter(e => {
    const t = territories.find(t => t.id === e.territory_id);
    return t?.sector === sector;
  }).slice(0, 3);

  const getFactionName = (id) => factions.find(f => f.id === id)?.name || "Unclaimed";
  const getFactionColor = (id) => factions.find(f => f.id === id)?.color;

  // Aggregate resources from territories in this sector
  const allResources = sectorTerritories.flatMap(t => t.resources || []);
  const uniqueResources = [...new Set(allResources)];

  // Max threat in sector
  const threatLevels = ["minimal", "low", "moderate", "high", "critical"];
  const maxThreat = sectorTerritories.reduce((max, t) => {
    const idx = threatLevels.indexOf(t.threat_level);
    return idx > threatLevels.indexOf(max) ? t.threat_level : max;
  }, "minimal");

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/50 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          SECTOR {sector} — INTEL BRIEF
        </span>
        <span className={`text-[9px] font-mono uppercase ${threatColor[maxThreat]}`}>
          THREAT: {maxThreat}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Territories in sector */}
        {sectorTerritories.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-[9px] text-muted-foreground tracking-widest uppercase">ZONES ({sectorTerritories.length})</div>
            {sectorTerritories.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-secondary/30 rounded-sm px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="h-3 w-3 shrink-0" style={{ color: getFactionColor(t.controlling_faction_id) }} />
                  <span className="text-[10px] font-mono text-foreground truncate">{t.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[8px] ${statusColor[t.status] || ""}`}>
                    {t.status}
                  </Badge>
                  <span className={`text-[8px] font-mono ${threatColor[t.threat_level]}`}>{t.threat_level}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No mapped zones in this sector.</p>
        )}

        {/* Resources */}
        {uniqueResources.length > 0 && (
          <div>
            <div className="text-[9px] text-muted-foreground tracking-widest uppercase mb-1">RESOURCES</div>
            <div className="flex gap-1 flex-wrap">
              {uniqueResources.map(r => (
                <Badge key={r} variant="outline" className="text-[8px] uppercase">{r}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Active missions */}
        {sectorJobs.length > 0 && (
          <div>
            <div className="text-[9px] text-muted-foreground tracking-widest uppercase mb-1">
              <Crosshair className="h-3 w-3 inline mr-1" />
              ACTIVE MISSIONS ({sectorJobs.length})
            </div>
            {sectorJobs.slice(0, 3).map(j => (
              <div key={j.id} className="text-[10px] font-mono text-foreground bg-secondary/20 rounded-sm px-2 py-1 mt-1">
                {j.title} <span className="text-muted-foreground">({j.difficulty} {j.type})</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent events */}
        {recentEvents.length > 0 && (
          <div>
            <div className="text-[9px] text-muted-foreground tracking-widest uppercase mb-1">
              <Radio className="h-3 w-3 inline mr-1" />
              RECENT ACTIVITY
            </div>
            {recentEvents.map(e => (
              <div key={e.id} className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate">
                • {e.title}
              </div>
            ))}
          </div>
        )}

        {/* Markers */}
        {sectorMarkers.length > 0 && (
          <div>
            <div className="text-[9px] text-muted-foreground tracking-widest uppercase mb-1">
              <MapPin className="h-3 w-3 inline mr-1" />
              MARKERS ({sectorMarkers.length})
            </div>
            <div className="flex gap-1 flex-wrap">
              {sectorMarkers.slice(0, 5).map(m => (
                <Badge key={m.id} variant="outline" className="text-[8px]">{m.label}</Badge>
              ))}
              {sectorMarkers.length > 5 && (
                <span className="text-[8px] text-muted-foreground">+{sectorMarkers.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sectorTerritories.length === 0 && sectorMarkers.length === 0 && sectorJobs.length === 0 && (
          <div className="text-center py-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-[9px] text-muted-foreground">Uncharted sector. No intel available.</p>
          </div>
        )}
      </div>
    </div>
  );
}