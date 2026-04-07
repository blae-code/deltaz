import {
  Cloud, Sun, CloudRain, CloudLightning, Snowflake, Wind, CloudFog,
  Thermometer, Eye, Radiation, Clock, Calendar, AlertTriangle
} from "lucide-react";
import CompassSvg from "../svg/CompassSvg";

const WEATHER_CONFIG = {
  clear:            { icon: Sun,             label: "Clear Skies",      color: "text-amber-400" },
  overcast:         { icon: Cloud,           label: "Overcast",         color: "text-muted-foreground" },
  fog:              { icon: CloudFog,        label: "Fog",              color: "text-muted-foreground" },
  rain:             { icon: CloudRain,       label: "Rain",             color: "text-blue-400" },
  heavy_rain:       { icon: CloudRain,       label: "Heavy Rain",      color: "text-blue-500" },
  thunderstorm:     { icon: CloudLightning,  label: "Thunderstorm",    color: "text-yellow-400" },
  snow:             { icon: Snowflake,       label: "Snow",             color: "text-blue-200" },
  blizzard:         { icon: Snowflake,       label: "Blizzard",         color: "text-blue-100" },
  dust_storm:       { icon: Wind,            label: "Dust Storm",       color: "text-orange-400" },
  ashfall:          { icon: Cloud,           label: "Ashfall",          color: "text-gray-400" },
  acid_rain:        { icon: CloudRain,       label: "Acid Rain",        color: "text-green-400" },
  radiation_storm:  { icon: Radiation,       label: "Radiation Storm",  color: "text-red-400" },
};

const SEASON_LABELS = {
  spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter",
  nuclear_winter: "Nuclear Winter", dry_season: "Dry Season", monsoon: "Monsoon",
};

const DAYLIGHT_CONFIG = {
  dawn:      { label: "Dawn",      bg: "from-orange-900/20 to-blue-900/10" },
  morning:   { label: "Morning",   bg: "from-amber-900/15 to-sky-900/10" },
  midday:    { label: "Midday",    bg: "from-yellow-900/10 to-transparent" },
  afternoon: { label: "Afternoon", bg: "from-amber-900/10 to-transparent" },
  dusk:      { label: "Dusk",      bg: "from-purple-900/20 to-orange-900/10" },
  night:     { label: "Night",     bg: "from-blue-950/30 to-indigo-950/20" },
  midnight:  { label: "Midnight",  bg: "from-gray-950/40 to-blue-950/30" },
};

const RAD_COLORS = {
  safe: "text-status-ok", low: "text-status-ok", moderate: "text-status-warn",
  high: "text-status-danger", lethal: "text-destructive",
};

const VIS_COLORS = {
  excellent: "text-status-ok", good: "text-status-ok", reduced: "text-status-warn",
  poor: "text-status-danger", zero: "text-destructive",
};

export default function TodayWorldConditions({ conditions }) {
  if (!conditions) return <WorldConditionsEmpty />;

  const weather = WEATHER_CONFIG[conditions.weather] || WEATHER_CONFIG.overcast;
  const WeatherIcon = weather.icon;
  const daylight = DAYLIGHT_CONFIG[conditions.daylight_phase] || DAYLIGHT_CONFIG.midday;
  const season = SEASON_LABELS[conditions.season] || conditions.season;
  const tempC = conditions.temperature_c ?? "--";
  const tempF = tempC !== "--" ? Math.round(tempC * 9 / 5 + 32) : "--";

  return (
    <div className={`border border-border rounded-sm overflow-hidden bg-gradient-to-br ${daylight.bg}`}>
      {/* Top band — time + weather hero */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* World date & time */}
          <div className="flex items-center gap-2 mb-1">
            {conditions.world_date && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-foreground">
                <Calendar className="h-3 w-3 text-primary" />
                {conditions.world_date}
              </span>
            )}
            {conditions.world_time && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-foreground">
                <Clock className="h-3 w-3 text-primary" />
                {conditions.world_time}
              </span>
            )}
          </div>
          {/* Season + daylight */}
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-mono">
            {season} · {daylight.label}
          </p>
        </div>

        {/* Weather icon + label */}
        <div className="flex flex-col items-center shrink-0">
          <WeatherIcon className={`h-8 w-8 ${weather.color}`} />
          <span className={`text-[9px] mt-1 font-mono font-semibold tracking-wider uppercase ${weather.color}`}>
            {weather.label}
          </span>
        </div>
      </div>

      {/* Conditions grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/50">
        <ConditionCell
          icon={Thermometer}
          label="TEMP"
          value={`${tempC}°C / ${tempF}°F`}
          color={tempC <= 0 ? "text-blue-300" : tempC >= 35 ? "text-red-400" : "text-foreground"}
        />
        <ConditionCell
          icon={Eye}
          label="VISIBILITY"
          value={(conditions.visibility || "good").replace("_", " ")}
          color={VIS_COLORS[conditions.visibility] || "text-foreground"}
        />
        <ConditionCell
          icon={Radiation}
          label="RADIATION"
          value={(conditions.radiation_level || "safe").toUpperCase()}
          color={RAD_COLORS[conditions.radiation_level] || "text-foreground"}
        />
        <ConditionCell
          icon={Wind}
          label="WIND"
          value={(conditions.wind || "calm").replace("_", " ")}
          color="text-foreground"
        />
      </div>

      {/* Special conditions */}
      {conditions.special_conditions?.length > 0 && (
        <div className="px-3 py-2 border-t border-border/50 flex flex-wrap gap-1.5">
          {conditions.special_conditions.map((cond, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold tracking-wider uppercase bg-accent/10 text-accent border border-accent/20 rounded-sm px-2 py-0.5"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              {cond}
            </span>
          ))}
        </div>
      )}

      {/* GM flavor text */}
      {conditions.gm_flavor_text && (
        <div className="px-4 py-2.5 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            "{conditions.gm_flavor_text}"
          </p>
        </div>
      )}
    </div>
  );
}

function ConditionCell({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card/80 px-3 py-2.5">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[8px] text-muted-foreground tracking-widest uppercase">{label}</span>
      </div>
      <span className={`text-[11px] font-mono font-semibold uppercase ${color}`}>{value}</span>
    </div>
  );
}

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