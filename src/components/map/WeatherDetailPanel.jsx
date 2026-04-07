import { useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CloudRain, Wind, Snowflake, Zap, Cloud, Thermometer,
  AlertTriangle, Loader2, ShieldAlert, Heart, X,
} from "lucide-react";

const HAZARD_ICONS = {
  acid_rain: CloudRain,
  dust_storm: Wind,
  freezing_cold: Snowflake,
  radiation_storm: Zap,
  toxic_fog: Cloud,
  heatwave: Thermometer,
};

const SEVERITY_LABELS = {
  1: "Mild",
  2: "Moderate",
  3: "Severe",
  4: "Extreme",
  5: "Catastrophic",
};

const SEVERITY_COLORS = {
  1: "text-status-ok",
  2: "text-accent",
  3: "text-status-warn",
  4: "text-destructive",
  5: "text-destructive",
};

const EFFECT_LABELS = {
  food: "Food",
  water: "Water",
  medical: "Medical",
  power: "Power",
  defense: "Defense",
  morale: "Morale",
};

export default function WeatherDetailPanel({ weatherMap, selectedSector, bulletin, stats, isAdmin, onApplyEffects, onClose }) {
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  const sectorData = selectedSector ? weatherMap?.[selectedSector] : null;

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await base44.functions.invoke("weatherSimulation", {
        action: "apply_effects",
        weather_map: weatherMap,
      });
      setResult(res.data);
      onApplyEffects?.();
    } catch (err) {
      setResult({ error: err.message });
    }
    setApplying(false);
  };

  // Hazard summary
  const hazardSectors = weatherMap
    ? Object.entries(weatherMap).filter(([, v]) => v.hazard)
    : [];

  const hazardGroups = {};
  hazardSectors.forEach(([sector, data]) => {
    if (!hazardGroups[data.hazard]) hazardGroups[data.hazard] = { label: data.label, color: data.color, sectors: [], maxSev: 0 };
    hazardGroups[data.hazard].sectors.push(sector);
    hazardGroups[data.hazard].maxSev = Math.max(hazardGroups[data.hazard].maxSev, data.severity);
  });

  return (
    <DataCard
      title="Weather Intel"
      headerRight={
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      }
    >
      <div className="space-y-3">
        {/* Bulletin */}
        {bulletin && (
          <div className="border border-accent/20 bg-accent/5 rounded-sm px-3 py-2">
            <p className="text-[10px] text-accent italic leading-snug">{bulletin}</p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="flex gap-3 text-[9px] text-muted-foreground">
            <span>{stats.hazardous} hazardous</span>
            <span>{stats.clear} clear</span>
            <span>{stats.hazard_types?.length || 0} types</span>
          </div>
        )}

        {/* Hazard Groups */}
        <div className="space-y-1.5">
          {Object.entries(hazardGroups).map(([key, group]) => {
            const Icon = HAZARD_ICONS[key] || AlertTriangle;
            return (
              <div key={key} className="flex items-center gap-2 border border-border/50 rounded-sm px-2.5 py-1.5 bg-secondary/20">
                <Icon className="h-3 w-3 shrink-0" style={{ color: group.color }} />
                <span className="text-[10px] font-mono font-semibold" style={{ color: group.color }}>
                  {group.label}
                </span>
                <span className="text-[8px] text-muted-foreground">
                  {group.sectors.length} sectors · max sev {group.maxSev}
                </span>
              </div>
            );
          })}
          {hazardSectors.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">All sectors clear.</p>
          )}
        </div>

        {/* Selected Sector Detail */}
        {sectorData?.hazard && (
          <div className="border rounded-sm px-3 py-2.5" style={{ borderColor: `${sectorData.color}40` }}>
            <div className="flex items-center gap-2 mb-1.5">
              {(() => {
                const Icon = HAZARD_ICONS[sectorData.hazard] || AlertTriangle;
                return <Icon className="h-3.5 w-3.5" style={{ color: sectorData.color }} />;
              })()}
              <span className="text-[11px] font-mono font-bold" style={{ color: sectorData.color }}>
                SECTOR {selectedSector} — {sectorData.label}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-[8px] ${SEVERITY_COLORS[sectorData.severity] || ""}`}>
                {SEVERITY_LABELS[sectorData.severity] || `Sev ${sectorData.severity}`}
              </Badge>
            </div>

            {/* Resource effects */}
            {sectorData.effects && Object.keys(sectorData.effects).length > 0 && (
              <div className="space-y-1 mb-2">
                <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Resource Impact</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(sectorData.effects).map(([res, val]) => (
                    <span key={res} className={`text-[9px] font-mono ${val < 0 ? "text-destructive" : "text-status-ok"}`}>
                      {EFFECT_LABELS[res] || res}: {val > 0 ? "+" : ""}{val}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Survivor effects */}
            {sectorData.survivor_effects && (
              <div className="space-y-1">
                <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Survivor Risk</div>
                <div className="flex flex-wrap gap-1.5">
                  {sectorData.survivor_effects.health && (
                    <span className="text-[9px] text-destructive flex items-center gap-0.5">
                      <Heart className="h-2.5 w-2.5" /> → {sectorData.survivor_effects.health}
                    </span>
                  )}
                  {sectorData.survivor_effects.stress_add > 0 && (
                    <span className="text-[9px] text-status-warn">
                      Stress +{sectorData.survivor_effects.stress_add}
                    </span>
                  )}
                  {sectorData.survivor_effects.rest_drain > 0 && (
                    <span className="text-[9px] text-accent">
                      Rest -{sectorData.survivor_effects.rest_drain}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin: Apply Effects */}
        {isAdmin && weatherMap && hazardSectors.length > 0 && (
          <Button
            size="sm"
            variant="destructive"
            className="w-full h-8 text-[10px] uppercase tracking-wider gap-1.5"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldAlert className="h-3 w-3" />}
            {applying ? "Applying..." : "Apply Weather Effects"}
          </Button>
        )}

        {/* Apply Results */}
        {result && !result.error && (
          <div className="border border-accent/20 bg-accent/5 rounded-sm px-3 py-2 space-y-1.5">
            <div className="text-[9px] text-accent font-semibold uppercase">Effects Applied</div>
            {result.affected_bases?.length > 0 && (
              <div className="text-[9px] text-muted-foreground">
                {result.affected_bases.length} base(s) affected
              </div>
            )}
            {result.affected_survivors?.length > 0 && (
              <div className="text-[9px] text-destructive">
                {result.affected_survivors.length} survivor(s) impacted
              </div>
            )}
            {result.colony_effects && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(result.colony_effects)
                  .filter(([, v]) => v !== 0)
                  .map(([res, val]) => (
                    <span key={res} className={`text-[8px] font-mono ${val < 0 ? "text-destructive" : "text-status-ok"}`}>
                      {EFFECT_LABELS[res] || res}: {val > 0 ? "+" : ""}{val}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}
        {result?.error && (
          <p className="text-[10px] text-destructive">{result.error}</p>
        )}
      </div>
    </DataCard>
  );
}