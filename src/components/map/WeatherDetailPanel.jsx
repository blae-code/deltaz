import DataCard from "../terminal/DataCard";
import { X, Thermometer, Eye, Radiation, Wind } from "lucide-react";
import SeasonGlyphSvg from "../svg/SeasonGlyphSvg";
import TelemetrySignalSvg from "../svg/TelemetrySignalSvg";
import WeatherStatusSvg from "../svg/WeatherStatusSvg";
import WorldClockSvg from "../svg/WorldClockSvg";
import useWorldClock from "../../hooks/useWorldClock";
import { getAuthorityTone } from "../../lib/world-state";

const TONE_CLASS = {
  ok: "text-status-ok",
  warn: "text-status-warn",
  error: "text-destructive",
  offline: "text-muted-foreground",
};

export default function WeatherDetailPanel({ conditions, selectedSector, onClose }) {
  const clock = useWorldClock(conditions);
  const tone = getAuthorityTone(clock.authorityStatus);

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
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono uppercase tracking-[0.18em]">
          <span className={`inline-flex items-center gap-1.5 rounded-sm border border-border/60 bg-secondary/20 px-2 py-1 ${TONE_CLASS[tone] || TONE_CLASS.offline}`}>
            <TelemetrySignalSvg size={12} variant={tone === "ok" ? "live" : tone === "warn" ? "stale" : tone === "error" ? "error" : "offline"} animated={clock.authorityStatus === "verified"} />
            {clock.authorityLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-sm border border-border/40 bg-secondary/10 px-2 py-1 text-muted-foreground">
            {clock.sourceLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-sm border border-border/40 bg-secondary/10 px-2 py-1 text-muted-foreground">
            {clock.freshnessLabel}
          </span>
        </div>

        <div className="border border-border/60 rounded-sm px-3 py-3 bg-secondary/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-mono text-foreground">
                <WorldClockSvg size={14} className="text-primary" animated={clock.isTicking} />
                <span>{clock.displayDate}</span>
                <span className="text-primary/80">{clock.displayTimeWithSeconds}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                <SeasonGlyphSvg size={14} variant={clock.seasonKey || "autumn"} className="text-primary/80" />
                <span>{clock.seasonLabel}</span>
                <span className="text-muted-foreground/30">/</span>
                <span>{clock.daylightLabel}</span>
              </div>
            </div>
            <div className="text-right">
              <WeatherStatusSvg size={32} variant={clock.weatherKey || "overcast"} className="text-primary" />
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-foreground mt-1">
                {clock.weatherLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <Metric icon={Thermometer} label="Temp" value={conditions?.temperature_c !== undefined ? `${conditions.temperature_c}°C` : "--"} />
          <Metric icon={Eye} label="Visibility" value={conditions?.visibility ? String(conditions.visibility).replace("_", " ") : "--"} />
          <Metric icon={Radiation} label="Radiation" value={conditions?.radiation_level ? String(conditions.radiation_level).toUpperCase() : "--"} />
          <Metric icon={Wind} label="Wind" value={conditions?.wind ? String(conditions.wind).replace("_", " ") : "--"} />
        </div>

        <div className="rounded-sm border border-border/60 bg-card/60 px-3 py-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-primary mb-1">
            Sector Coverage
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {selectedSector
              ? `Sector ${selectedSector} has no authoritative sector-level weather payload yet. Only server-verified global conditions are displayed.`
              : "Authoritative sector-level weather is not available yet. Only server-verified global conditions are displayed."}
          </p>
        </div>

        {clock.lastSyncError && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] text-destructive">
            {clock.lastSyncError}
          </div>
        )}
      </div>
    </DataCard>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-sm border border-border/50 bg-card/70 px-3 py-2">
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <div className="text-[11px] uppercase tracking-wide text-foreground">{value}</div>
    </div>
  );
}
