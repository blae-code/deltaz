import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers, MapPin, Flame, Route, Shield, Swords, Package, Crosshair, Eye, EyeOff, CloudRain,
} from "lucide-react";

export default function MapFilterBar({
  showTerritories, setShowTerritories,
  showMarkers, setShowMarkers,
  showHeatmap, toggleHeatmap, heatmapLoading,
  showMissions, setShowMissions,
  showResourceDensity, setShowResourceDensity,
  showContested, setShowContested,
  showPlanner, onTogglePlanner,
  showWeather, toggleWeather, weatherLoading,
  selectedMarker,
  counts,
}) {
  const filters = [
    { key: "zones", label: "ZONES", icon: Layers, active: showTerritories, onClick: () => setShowTerritories(!showTerritories), count: counts.territories },
    { key: "markers", label: "MARKERS", icon: MapPin, active: showMarkers, onClick: () => setShowMarkers(!showMarkers), count: counts.markers },
    { key: "missions", label: "MISSIONS", icon: Crosshair, active: showMissions, onClick: () => setShowMissions(!showMissions), count: counts.missions },
    { key: "contested", label: "CONTESTED", icon: Swords, active: showContested, onClick: () => setShowContested(!showContested), count: counts.contested },
    { key: "resources", label: "RESOURCES", icon: Package, active: showResourceDensity, onClick: () => setShowResourceDensity(!showResourceDensity) },
    { key: "threat", label: "THREAT", icon: Flame, active: showHeatmap, onClick: toggleHeatmap, loading: heatmapLoading },
    { key: "weather", label: "WEATHER", icon: CloudRain, active: showWeather, onClick: toggleWeather, loading: weatherLoading, count: counts.weather },
    { key: "planner", label: "PLANNER", icon: Route, active: showPlanner, onClick: onTogglePlanner },
  ];

  return (
    <div className="flex gap-1.5 flex-wrap">
      {filters.map(f => (
        <Button
          key={f.key}
          variant={f.active ? "default" : "outline"}
          size="sm"
          className="h-8 text-[10px] tracking-wider gap-1.5 px-2.5"
          onClick={f.onClick}
          disabled={f.loading}
        >
          <f.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{f.label}</span>
          {f.count > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[8px] ml-0.5">{f.count}</Badge>
          )}
        </Button>
      ))}
    </div>
  );
}