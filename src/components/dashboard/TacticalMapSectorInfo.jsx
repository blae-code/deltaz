import { Shield, AlertTriangle } from "lucide-react";

const threatLabel = {
  minimal: { text: "MINIMAL", color: "text-status-ok" },
  low: { text: "LOW", color: "text-status-ok" },
  moderate: { text: "MODERATE", color: "text-status-warn" },
  high: { text: "HIGH", color: "text-status-danger" },
  critical: { text: "CRITICAL", color: "text-status-danger" },
};

export default function TacticalMapSectorInfo({ sector, territory, faction }) {
  if (!sector) {
    return (
      <div className="border border-border rounded-sm p-3 bg-secondary/30 flex items-center justify-center min-h-[80px]">
        <span className="text-[9px] text-muted-foreground font-mono tracking-wider">
          HOVER SECTOR FOR INTEL
        </span>
      </div>
    );
  }

  if (!territory) {
    return (
      <div className="border border-border rounded-sm p-3 bg-secondary/30 min-h-[80px]">
        <p className="text-[10px] text-primary font-mono font-semibold tracking-widest">
          SECTOR {sector}
        </p>
        <p className="text-[9px] text-muted-foreground mt-1 font-mono">No territory data.</p>
      </div>
    );
  }

  const threat = threatLabel[territory.threat_level] || { text: "UNKNOWN", color: "text-muted-foreground" };
  const resources = Array.isArray(territory.resources) ? territory.resources : [];

  return (
    <div className="border border-border rounded-sm p-3 bg-secondary/30 space-y-2 min-h-[80px]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-primary font-mono font-semibold tracking-widest">
          {territory.name || `SECTOR ${sector}`}
        </p>
        <span className="text-[8px] text-muted-foreground font-mono">{sector}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] font-mono text-muted-foreground">Threat:</span>
          <span className={`text-[9px] font-mono font-semibold ${threat.color}`}>{threat.text}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] font-mono text-muted-foreground">Control:</span>
          {faction ? (
            <span className="text-[9px] font-mono font-semibold" style={{ color: faction.color || undefined }}>
              {faction.tag} {faction.name}
            </span>
          ) : (
            <span className="text-[9px] font-mono text-muted-foreground/60">UNCLAIMED</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-muted-foreground">Status:</span>
          <span className="text-[9px] font-mono font-semibold text-foreground uppercase">
            {territory.status || "unknown"}
          </span>
        </div>

        {resources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {resources.map((r) => (
              <span key={r} className="text-[8px] font-mono bg-primary/10 text-primary px-1 py-0.5 rounded-sm">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}