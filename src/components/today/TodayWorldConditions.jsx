import { useState, useEffect } from "react";
import {
  Cloud, Sun, CloudRain, CloudLightning, Snowflake, Wind, CloudFog,
  Thermometer, Eye, Radiation, Clock, Calendar, AlertTriangle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CompassSvg from "../svg/CompassSvg";
import WeatherParticles from "./weather/WeatherParticles";
import LightningFlash from "./weather/LightningFlash";
import ConditionTooltipCell from "./weather/ConditionTooltipCell";

/* ── CONFIG TABLES ── */

const WEATHER_CONFIG = {
  clear:            { icon: Sun,             label: "Clear Skies",      color: "text-amber-400",          tip: "Excellent conditions. Full visibility, ideal for scavenging and long-range patrols. No penalties." },
  overcast:         { icon: Cloud,           label: "Overcast",         color: "text-muted-foreground",   tip: "Cloudy skies. No significant impact on operations but solar power output reduced ~20%." },
  fog:              { icon: CloudFog,        label: "Dense Fog",        color: "text-muted-foreground",   tip: "Visibility severely reduced. Scavenge runs risk ambush. Enemy detection range halved." },
  rain:             { icon: CloudRain,       label: "Rain",             color: "text-blue-400",           tip: "Wet conditions. Movement speed reduced 10%. Tracks are harder to follow. Water collection boosted." },
  heavy_rain:       { icon: CloudRain,       label: "Heavy Rain",      color: "text-blue-500",           tip: "Torrential rain. Movement -20%, visibility poor. Flooding risk to low-ground structures. Water reserves +30%." },
  thunderstorm:     { icon: CloudLightning,  label: "Thunderstorm",    color: "text-yellow-400",         tip: "Dangerous electrical storms. Lightning can damage exposed modules. Comms disrupted. Stay inside." },
  snow:             { icon: Snowflake,       label: "Snow",             color: "text-blue-200",           tip: "Cold front. Food consumption +15%, hypothermia risk for outdoor tasks. Tracks visible longer." },
  blizzard:         { icon: Snowflake,       label: "Blizzard",         color: "text-blue-100",           tip: "Whiteout conditions. All outdoor operations halted. Survivors outside risk frostbite. Power drain +25%." },
  dust_storm:       { icon: Wind,            label: "Dust Storm",       color: "text-orange-400",         tip: "Abrasive winds. Equipment degradation +30%, solar panels offline. Breathing hazard without masks." },
  ashfall:          { icon: Cloud,           label: "Ashfall",          color: "text-gray-400",           tip: "Volcanic or industrial ash. Air quality hazardous. Medical supply consumption +20%. Crop damage risk." },
  acid_rain:        { icon: CloudRain,       label: "Acid Rain",        color: "text-green-400",          tip: "Corrosive precipitation. Exposed structures take damage. Water reserves contaminated. Stay sheltered." },
  radiation_storm:  { icon: Radiation,       label: "RAD STORM",        color: "text-red-400",            tip: "CRITICAL: Lethal radiation levels. All survivors must shelter immediately. Exposure causes sickness and death." },
};

const SEASON_CONFIG = {
  spring:         { label: "Spring",         tip: "Growing season. Crop yields +20%, wildlife more active. Moderate temperatures." },
  summer:         { label: "Summer",         tip: "Peak heat. Water consumption +25%, but longest daylight for operations." },
  autumn:         { label: "Autumn",         tip: "Harvest time. Food gathering bonus. Temperatures dropping, prepare winter stores." },
  winter:         { label: "Winter",         tip: "Harsh cold. Heating fuel required. Food production halted. Defense raids increase." },
  nuclear_winter: { label: "Nuclear Winter", tip: "EXTREME: Permanent twilight, sub-zero temps. Crops impossible. Survival mode only." },
  dry_season:     { label: "Dry Season",     tip: "Water scarce. Wells depleting faster. Fire risk elevated. Trade value of water doubles." },
  monsoon:        { label: "Monsoon",        tip: "Constant rain. Flooding damages ground-level modules. Water abundant but disease risk +30%." },
};

const DAYLIGHT_CONFIG = {
  dawn:      { label: "Dawn",      bg: "from-orange-900/30 via-amber-950/15 to-blue-950/20",   glow: "rgba(251,146,60,0.08)" },
  morning:   { label: "Morning",   bg: "from-amber-900/20 via-yellow-950/10 to-sky-950/10",    glow: "rgba(251,191,36,0.06)" },
  midday:    { label: "Midday",    bg: "from-yellow-900/15 via-amber-950/5 to-transparent",     glow: "rgba(253,224,71,0.05)" },
  afternoon: { label: "Afternoon", bg: "from-amber-900/15 via-orange-950/8 to-transparent",     glow: "rgba(251,146,60,0.05)" },
  dusk:      { label: "Dusk",      bg: "from-purple-900/25 via-rose-950/15 to-orange-950/15",   glow: "rgba(168,85,247,0.08)" },
  night:     { label: "Night",     bg: "from-blue-950/40 via-indigo-950/30 to-slate-950/20",    glow: "rgba(99,102,241,0.06)" },
  midnight:  { label: "Midnight",  bg: "from-gray-950/50 via-blue-950/40 to-indigo-950/30",     glow: "rgba(30,27,75,0.1)" },
};

const RAD_CONFIG = {
  safe:     { color: "text-status-ok",     pulse: null,                       tip: "Background radiation normal. No protective equipment needed." },
  low:      { color: "text-status-ok",     pulse: null,                       tip: "Slightly elevated. Long outdoor exposure may cause minor symptoms. Monitor dosimeters." },
  moderate: { color: "text-status-warn",   pulse: "rgba(212,145,26,0.1)",     tip: "Hazardous zone. Limit outdoor time to 2 hours. Rad-suits recommended for scavengers." },
  high:     { color: "text-status-danger", pulse: "rgba(197,48,48,0.15)",     tip: "DANGER: Rapid exposure damage. Full rad-protection required. Unshielded survivors take health damage." },
  lethal:   { color: "text-destructive",   pulse: "rgba(239,68,68,0.2)",      tip: "LETHAL: Instant health drain. Underground shelter mandatory. Any exposed survivor will die." },
};

const VIS_CONFIG = {
  excellent: { color: "text-status-ok",     tip: "Crystal clear. Maximum engagement range. Snipers and scouts at full effectiveness." },
  good:      { color: "text-status-ok",     tip: "Standard visibility. No penalties to detection or combat accuracy." },
  reduced:   { color: "text-status-warn",   tip: "Hazy conditions. Detection range -30%. Ranged combat accuracy reduced." },
  poor:      { color: "text-status-danger", tip: "Near-blind. Ambush chance +50%. Only close-range combat effective. Patrols risky." },
  zero:      { color: "text-destructive",   tip: "Total whiteout/blackout. Navigation impossible without instruments. All ops suspended." },
};

const WIND_CONFIG = {
  calm:     { tip: "Still air. No effect on operations. Ideal for construction and precision work." },
  light:    { tip: "Gentle breeze. Negligible impact. Good conditions for all activities." },
  moderate: { tip: "Noticeable wind. Ranged accuracy -10%. Construction slightly slower." },
  strong:   { tip: "High winds. Ranged combat -25%. Small structures may take damage. Flight ops grounded." },
  gale:     { tip: "Extreme winds. All outdoor construction halted. Movement -30%. Debris hazard." },
};

const TEMP_TIPS = {
  freezing: "Sub-zero. Hypothermia risk without heating. Food consumption +20%. Water sources frozen.",
  cold:     "Cold conditions. Heating recommended. Slight stamina drain on outdoor activities.",
  mild:     "Comfortable temperature range. No penalties to any operations.",
  hot:      "High heat. Water consumption +25%. Overheating risk during physical labor.",
  extreme:  "Extreme heat. Heatstroke danger. Mandatory rest breaks. Water usage doubled.",
};

function getTempInfo(c) {
  if (c <= 0)  return { color: "text-blue-300",  tip: TEMP_TIPS.freezing, pulse: "rgba(147,197,253,0.1)" };
  if (c <= 10) return { color: "text-blue-200",  tip: TEMP_TIPS.cold, pulse: null };
  if (c <= 30) return { color: "text-foreground", tip: TEMP_TIPS.mild, pulse: null };
  if (c <= 40) return { color: "text-orange-400", tip: TEMP_TIPS.hot, pulse: "rgba(251,146,60,0.08)" };
  return             { color: "text-red-400",     tip: TEMP_TIPS.extreme, pulse: "rgba(239,68,68,0.12)" };
}

/* ── MAIN COMPONENT ── */

export default function TodayWorldConditions({ conditions }) {
  if (!conditions) return <WorldConditionsEmpty />;

  const weather = WEATHER_CONFIG[conditions.weather] || WEATHER_CONFIG.overcast;
  const WeatherIcon = weather.icon;
  const daylight = DAYLIGHT_CONFIG[conditions.daylight_phase] || DAYLIGHT_CONFIG.midday;
  const season = SEASON_CONFIG[conditions.season] || { label: conditions.season, tip: "" };
  const tempC = conditions.temperature_c ?? "--";
  const tempF = tempC !== "--" ? Math.round(tempC * 9 / 5 + 32) : "--";
  const tempInfo = tempC !== "--" ? getTempInfo(tempC) : { color: "text-foreground", tip: "", pulse: null };
  const radInfo = RAD_CONFIG[conditions.radiation_level] || RAD_CONFIG.safe;
  const visInfo = VIS_CONFIG[conditions.visibility] || VIS_CONFIG.good;
  const windInfo = WIND_CONFIG[conditions.wind] || WIND_CONFIG.calm;

  const isDangerous = ["radiation_storm", "blizzard", "acid_rain", "thunderstorm"].includes(conditions.weather);
  const isNight = ["night", "midnight"].includes(conditions.daylight_phase);

  return (
    <div className={`relative border overflow-hidden transition-all duration-700 ${
      isDangerous ? "border-destructive/40 animate-glow-pulse-subtle" : "border-border"
    } bg-gradient-to-br ${daylight.bg}`}>

      {/* Ambient glow overlay for time-of-day feel */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{ background: `radial-gradient(ellipse at 70% 20%, ${daylight.glow} 0%, transparent 70%)` }}
      />

      {/* Weather particle system */}
      <WeatherParticles weather={conditions.weather} />

      {/* Lightning flash for thunderstorms */}
      <LightningFlash active={conditions.weather === "thunderstorm"} />

      {/* Fog overlay */}
      {conditions.weather === "fog" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 via-white/8 to-white/3 animate-pulse" style={{ animationDuration: "4s" }} />
      )}

      {/* Night vignette */}
      {isNight && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.3) 100%)"
        }} />
      )}

      {/* ── Top band: time + weather hero ── */}
      <div className="relative px-4 pt-4 pb-3 flex items-start justify-between gap-3 z-[2]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {conditions.world_date && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-foreground">
                <Calendar className="h-3 w-3 text-primary" />
                {conditions.world_date}
              </span>
            )}
            {conditions.world_time && (
              <LiveClock time={conditions.world_time} />
            )}
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-mono cursor-help hover:text-foreground transition-colors">
                  {season.label} · {daylight.label}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-[11px] bg-card border-border">
                <p className="font-semibold text-primary mb-0.5">{season.label}</p>
                <p className="text-muted-foreground">{season.tip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Weather icon — animated */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center shrink-0 cursor-help group">
                <div className={`relative ${isDangerous ? "animate-pulse" : ""}`}>
                  <WeatherIcon className={`h-10 w-10 ${weather.color} transition-transform group-hover:scale-110 drop-shadow-lg`} />
                  {isDangerous && (
                    <div className="absolute inset-0 rounded-full blur-lg opacity-40" style={{
                      background: conditions.weather === "radiation_storm" ? "rgba(239,68,68,0.5)" :
                                  conditions.weather === "acid_rain" ? "rgba(74,222,128,0.4)" :
                                  conditions.weather === "thunderstorm" ? "rgba(250,204,21,0.4)" :
                                  "rgba(147,197,253,0.4)"
                    }} />
                  )}
                </div>
                <span className={`text-[9px] mt-1 font-mono font-semibold tracking-wider uppercase ${weather.color}`}>
                  {weather.label}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[240px] text-[11px] bg-card border-border">
              <p className="font-semibold text-primary mb-0.5">{weather.label}</p>
              <p className="text-muted-foreground leading-relaxed">{weather.tip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* ── Conditions grid with tooltips ── */}
      <div className="relative z-[2] grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/50">
        <ConditionTooltipCell
          icon={Thermometer}
          label="TEMP"
          value={`${tempC}°C / ${tempF}°F`}
          color={tempInfo.color}
          tooltip={tempInfo.tip}
          pulseColor={tempInfo.pulse}
        />
        <ConditionTooltipCell
          icon={Eye}
          label="VISIBILITY"
          value={(conditions.visibility || "good").replace("_", " ")}
          color={visInfo.color}
          tooltip={visInfo.tip}
        />
        <ConditionTooltipCell
          icon={Radiation}
          label="RADIATION"
          value={(conditions.radiation_level || "safe").toUpperCase()}
          color={radInfo.color}
          tooltip={radInfo.tip}
          pulseColor={radInfo.pulse}
        />
        <ConditionTooltipCell
          icon={Wind}
          label="WIND"
          value={(conditions.wind || "calm").replace("_", " ")}
          color="text-foreground"
          tooltip={windInfo.tip}
        />
      </div>

      {/* ── Special conditions ── */}
      {conditions.special_conditions?.length > 0 && (
        <div className="relative z-[2] px-3 py-2 border-t border-border/50 flex flex-wrap gap-1.5">
          {conditions.special_conditions.map((cond, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold tracking-wider uppercase bg-accent/10 text-accent border border-accent/20 rounded-sm px-2 py-0.5 animate-pulse"
              style={{ animationDelay: `${i * 300}ms` }}
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              {cond}
            </span>
          ))}
        </div>
      )}

      {/* ── GM flavor text ── */}
      {conditions.gm_flavor_text && (
        <div className="relative z-[2] px-4 py-2.5 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            "{conditions.gm_flavor_text}"
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Live Clock with pulse ── */
function LiveClock({ time }) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="flex items-center gap-1 text-[11px] font-mono text-foreground">
      <Clock className="h-3 w-3 text-primary" />
      <span>{time}</span>
      <span className={`inline-block h-1.5 w-1.5 rounded-full bg-primary transition-opacity duration-500 ${pulse ? "opacity-100" : "opacity-20"}`} />
    </span>
  );
}

/* ── Empty state ── */
function WorldConditionsEmpty() {
  return (
    <div className="border border-dashed border-border rounded-sm px-4 py-6 text-center">
      <CompassSvg size={40} className="text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-[10px] text-muted-foreground/60 font-mono tracking-wider">
        WORLD CONDITIONS UNAVAILABLE — AWAITING GM DATA
      </p>
    </div>
  );
}