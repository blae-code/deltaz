import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers, MapPin, Flame, Route, Shield, Swords, Package, Crosshair, Eye, EyeOff,
} from "lucide-react";

export default function MapFilterBar({
  showTerritories, setShowTerritories,
  showMarkers, setShowMarkers,
  showHeatmap, toggleHeatmap, heatmapLoading,
  showMissions, setShowMissions,
  showResourceDensity, setShowResourceDensity,
  showContested, setShowContested,
  showPlanner, onTogglePlanner,
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
    { key: "planner", label: "PLANNER", icon: Route, active: showPlanner, onClick: onTogglePlanner },
  ];

  return (
    <div className="flex gap-1 flex-wrap">
      {filters.map(f => (
        <Button
          key={f.key}
          variant={f.active ? "default" : "outline"}
          size="sm"
          className="h-7 text-[8px] tracking-wider gap-1 px-2"
          onClick={f.onClick}
          disabled={f.loading}
        >
          <f.icon className="h-3 w-3" />
          <span className="hidden sm:inline">{f.label}</span>
          {f.count > 0 && (
            <Badge variant="secondary" className="h-3.5 px-1 text-[7px] ml-0.5">{f.count}</Badge>
          )}
        </Button>
      ))}
    </div>
  );
}