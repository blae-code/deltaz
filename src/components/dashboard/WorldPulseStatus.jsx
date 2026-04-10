import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { pullWorldState as requestWorldStatePull } from "@/api/serverApi";
import { Button } from "@/components/ui/button";
import { Info, RefreshCw, Radio } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SeasonGlyphSvg from "../svg/SeasonGlyphSvg";
import TelemetrySignalSvg from "../svg/TelemetrySignalSvg";
import WeatherStatusSvg from "../svg/WeatherStatusSvg";
import WorldClockSvg from "../svg/WorldClockSvg";
import useWorldClock from "../../hooks/useWorldClock";
import useWorldState from "../../hooks/useWorldState";
import { getAuthorityTone } from "../../lib/world-state";

export default function WorldPulseStatus({ isAdmin }) {
  const [running, setRunning] = useState(false);
  const [syncingWorld, setSyncingWorld] = useState(false);
  const { toast } = useToast();
  const worldQuery = useWorldState();
  const worldClock = useWorldClock(worldQuery.data);
  const tone = getAuthorityTone(worldClock.authorityStatus);
  const signalVariant = tone === "ok" ? "live" : tone === "warn" ? "stale" : tone === "error" ? "error" : "offline";

  const triggerPulse = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("worldPulse", {});
      toast({
        title: "GHOST PROTOCOL — World Pulse",
        description: `Generated ${res.data.intel_generated} intel reports and ${res.data.events_generated} world events`,
      });
    } catch (error) {
      toast({
        title: "World Pulse failed",
        description: error?.message || "Unable to trigger a World Pulse cycle.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const pullWorldState = async () => {
    setSyncingWorld(true);
    try {
      const res = await requestWorldStatePull();
      await worldQuery.refetch();
      toast({
        title: "World telemetry synced",
        description: res?.authority_status === "verified"
          ? `${res.world_conditions?.weather || "Weather"} @ ${res.world_conditions?.world_time || "--:--"}`
          : (res?.error || "World state sync completed with warnings."),
      });
    } catch (error) {
      toast({
        title: "World telemetry sync failed",
        description: error?.message || "Unable to pull a fresh authoritative snapshot.",
        variant: "destructive",
      });
    } finally {
      setSyncingWorld(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border border-border bg-card rounded-sm px-3 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[10px] font-mono text-primary tracking-widest">WORLD PULSE</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help">
                <span className="text-[9px] text-muted-foreground">Pulse every 30 min · telemetry every 60 sec</span>
                <Info className="h-3 w-3 text-muted-foreground/50 hover:text-primary transition-colors" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30 max-w-[280px]">
              <p className="text-primary font-semibold text-[10px] mb-1">WORLD OPERATIONS</p>
              <p className="text-muted-foreground">World Pulse generates derived intel and event output. World telemetry is a separate authoritative server snapshot used for time, season, weather, and daylight.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="rounded-sm border border-border/60 bg-secondary/10 px-3 py-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em]">
                <TelemetrySignalSvg size={14} variant={signalVariant} animated={worldClock.authorityStatus === "verified"} className={toneClass(tone)} />
                <span className={toneClass(tone)}>{worldClock.authorityLabel}</span>
                <span className="text-muted-foreground">{worldClock.sourceLabel}</span>
                <span className="text-muted-foreground/70">{worldClock.freshnessLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-foreground">
                <WorldClockSvg size={14} className="text-primary" animated={worldClock.isTicking} />
                <span>{worldClock.displayDate}</span>
                <span className="text-primary/80">{worldClock.displayTimeWithSeconds}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <SeasonGlyphSvg size={13} variant={worldClock.seasonKey || "autumn"} className="text-primary/80" />
                  {worldClock.seasonLabel}
                </span>
                <span className="text-muted-foreground/30">/</span>
                <span className="inline-flex items-center gap-1.5">
                  <WeatherStatusSvg size={13} variant={worldClock.weatherKey || "overcast"} className="text-primary/80" />
                  {worldClock.weatherLabel}
                </span>
                <span className="text-muted-foreground/30">/</span>
                <span>{worldClock.daylightLabel}</span>
              </div>
              {worldClock.lastSyncError && (
                <p className="text-[10px] text-destructive break-words">{worldClock.lastSyncError}</p>
              )}
            </div>

            {isAdmin && (
              <div className="flex gap-1.5 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[9px] tracking-wider text-muted-foreground hover:text-primary"
                      onClick={pullWorldState}
                      disabled={syncingWorld}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${syncingWorld ? "animate-spin" : ""}`} />
                      {syncingWorld ? "SYNCING..." : "SYNC WORLD"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
                    <p className="text-muted-foreground">Pull a fresh authoritative world snapshot now.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[9px] tracking-wider text-muted-foreground hover:text-primary"
                      onClick={triggerPulse}
                      disabled={running}
                    >
                      <Radio className="h-3 w-3 mr-1" />
                      {running ? "PULSING..." : "MANUAL PULSE"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-mono text-[11px] bg-card border-primary/30">
                    <p className="text-muted-foreground">Manually trigger a World Pulse cycle now instead of waiting for the next scheduled run.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function toneClass(tone) {
  if (tone === "ok") return "text-status-ok";
  if (tone === "warn") return "text-status-warn";
  if (tone === "error") return "text-destructive";
  return "text-muted-foreground";
}
