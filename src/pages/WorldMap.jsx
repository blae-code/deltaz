import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import GridMap from "../components/map/GridMap";
import MapMarkerPin from "../components/map/MapPin";
import TerritoryOverlay from "../components/map/TerritoryOverlay";
import HeatmapOverlay from "../components/map/HeatmapOverlay";
import HeatmapLegend from "../components/map/HeatmapLegend";
import ThreatPredictionPanel from "../components/map/ThreatPredictionPanel";
import MarkerPanel from "../components/map/MarkerPanel";
import FactionFilter from "../components/map/FactionFilter";
import MissionPlanOverlay from "../components/map/MissionPlanOverlay";
import PlanRouteLines from "../components/map/PlanRouteLines";
import SectorDetailPanel from "../components/map/SectorDetailPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, Flame, Loader2, Route } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function WorldMap() {
  const [territories, setTerritories] = useState([]);
  const [factions, setFactions] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [pendingPosition, setPendingPosition] = useState(null);
  const [showTerritories, setShowTerritories] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [hoveredSector, setHoveredSector] = useState(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [planAnchor, setPlanAnchor] = useState(null);
  const [planJobs, setPlanJobs] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.Territory.list("-created_date", 50),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.MapMarker.list("-created_date", 100),
      base44.auth.me(),
      base44.entities.Job.filter({ status: "available" }, "-created_date", 100),
      base44.entities.Event.filter({ is_active: true }, "-created_date", 20),
    ])
      .then(([t, f, m, u, j, e]) => {
        setTerritories(t);
        setFactions(f);
        setMarkers(m);
        setUser(u);
        setAvailableJobs(j);
        setEvents(e || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Real-time marker updates
  useEffect(() => {
    const unsub = base44.entities.MapMarker.subscribe((ev) => {
      if (ev.type === "create") {
        setMarkers((prev) => [ev.data, ...prev]);
      } else if (ev.type === "delete") {
        setMarkers((prev) => prev.filter((m) => m.id !== ev.id));
      } else if (ev.type === "update") {
        setMarkers((prev) => prev.map((m) => (m.id === ev.id ? ev.data : m)));
      }
    });
    return unsub;
  }, []);

  const getFaction = (id) => factions.find((f) => f.id === id);

  const filteredTerritories = selectedFaction
    ? territories.filter((t) => t.controlling_faction_id === selectedFaction)
    : territories;

  const visibleMarkers = markers.filter((m) => {
    if (!m.is_shared && m.created_by !== user?.email) return false;
    return true;
  });

  const handleGridClick = ({ x, y, sector }) => {
    setSelectedMarker(null);
    setPendingPosition({ x, y, sector });
  };

  const handleCreateMarker = async (data) => {
    await base44.entities.MapMarker.create(data);
    toast({ title: "Marker dropped", description: `${data.label} at ${data.sector}` });
    setPendingPosition(null);
  };

  const handleDeleteMarker = async (id) => {
    await base44.entities.MapMarker.delete(id);
    toast({ title: "Marker removed" });
    setSelectedMarker(null);
  };

  const handleSelectMarker = (marker) => {
    setPendingPosition(null);
    setSelectedMarker(marker);
  };

  const handleStartPlan = (marker) => {
    setPlanAnchor(marker);
    setPlanJobs([]);
    setShowPlanner(true);
    setSelectedMarker(null);
  };

  const handleTogglePlanJob = (jobId) => {
    setPlanJobs(prev => prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]);
  };

  const loadHeatmap = useCallback(async () => {
    setHeatmapLoading(true);
    try {
      const res = await base44.functions.invoke("threatAnalysis", {});
      setHeatmapData(res.data);
    } catch (err) {
      toast({ title: "Threat analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setHeatmapLoading(false);
    }
  }, [toast]);

  const toggleHeatmap = () => {
    if (!showHeatmap && !heatmapData) loadHeatmap();
    setShowHeatmap(!showHeatmap);
  };

  const handleHeatmapSectorClick = (sector) => {
    setHoveredSector(sector);
  };

  // Count territories per sector for the info display
  const sectorTerritories = hoveredSector
    ? territories.filter((t) => t.sector === hoveredSector)
    : [];
  const sectorMarkers = hoveredSector
    ? visibleMarkers.filter((m) => m.sector === hoveredSector)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">SCANNING SECTORS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Tactical Grid
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            5×5 sector map — click to drop markers, share intel
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={showTerritories ? "default" : "outline"}
            size="sm"
            className="h-7 text-[9px] tracking-wider"
            onClick={() => setShowTerritories(!showTerritories)}
          >
            <Layers className="h-3 w-3 mr-1" />
            ZONES
          </Button>
          <Button
            variant={showMarkers ? "default" : "outline"}
            size="sm"
            className="h-7 text-[9px] tracking-wider"
            onClick={() => setShowMarkers(!showMarkers)}
          >
            <MapPin className="h-3 w-3 mr-1" />
            MARKERS
          </Button>
          <Button
            variant={showPlanner ? "default" : "outline"}
            size="sm"
            className="h-7 text-[9px] tracking-wider"
            onClick={() => {
              if (showPlanner) { setShowPlanner(false); setPlanAnchor(null); setPlanJobs([]); }
              else if (selectedMarker) { handleStartPlan(selectedMarker); }
              else { setShowPlanner(true); }
            }}
          >
            <Route className="h-3 w-3 mr-1" />
            PLANNER
          </Button>
          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            className="h-7 text-[9px] tracking-wider"
            onClick={toggleHeatmap}
            disabled={heatmapLoading}
          >
            {heatmapLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Flame className="h-3 w-3 mr-1" />}
            THREAT MAP
          </Button>
        </div>
      </div>

      {/* Faction Filter */}
      <FactionFilter
        factions={factions}
        selectedFactionId={selectedFaction}
        onSelect={setSelectedFaction}
      />

      {/* Map + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grid Map */}
        <div className="lg:col-span-2">
          <GridMap
            onGridClick={handleGridClick}
            selectedSector={selectedMarker?.sector || pendingPosition?.sector}
            onSectorHover={setHoveredSector}
          >
            {/* Heatmap overlay */}
            {showHeatmap && heatmapData?.sector_scores && (
              <HeatmapOverlay
                sectorScores={heatmapData.sector_scores}
                onSectorClick={handleHeatmapSectorClick}
              />
            )}

            {/* Territory zone overlays */}
            {showTerritories &&
              filteredTerritories.map((t) => {
                const faction = getFaction(t.controlling_faction_id);
                return (
                  <TerritoryOverlay
                    key={t.id}
                    territory={t}
                    factionColor={faction?.color}
                  />
                );
              })}

            {/* Territory center pins */}
            {showTerritories &&
              filteredTerritories
                .filter((t) => t.sector)
                .map((t) => {
                  const faction = getFaction(t.controlling_faction_id);
                  const parts = t.sector.split("-");
                  if (parts.length !== 2) return null;
                  const rowIdx = ["A", "B", "C", "D", "E"].indexOf(parts[0].toUpperCase());
                  const colIdx = parseInt(parts[1]) - 1;
                  if (rowIdx < 0 || colIdx < 0) return null;
                  // Place in center of sector
                  const x = colIdx * 20 + 10;
                  const y = rowIdx * 20 + 10;
                  return (
                    <MapMarkerPin
                      key={`t-${t.id}`}
                      x={x}
                      y={y}
                      label={t.name}
                      type="territory"
                      color={faction?.color}
                      size="sm"
                      onClick={() => {}}
                    />
                  );
                })}

            {/* User markers */}
            {showMarkers &&
              visibleMarkers.map((m) => (
                <MapMarkerPin
                  key={m.id}
                  x={m.grid_x}
                  y={m.grid_y}
                  label={m.label}
                  type={m.marker_type}
                  color={m.color}
                  isSelected={selectedMarker?.id === m.id}
                  onClick={() => handleSelectMarker(m)}
                />
              ))}

            {/* Pending position indicator */}
            {pendingPosition && (
              <div
                className="absolute z-20 h-6 w-6 rounded-full border-2 border-primary bg-primary/20 animate-pulse pointer-events-none"
                style={{
                  left: `${pendingPosition.x}%`,
                  top: `${pendingPosition.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}

            {/* Mission planning route lines */}
            {showPlanner && planAnchor && (
              <PlanRouteLines
                anchorMarker={planAnchor}
                selectedJobs={planJobs}
                jobs={availableJobs}
                territories={territories}
              />
            )}
          </GridMap>

          {/* Heatmap legend + Sector info bar */}
          <div className="mt-2 space-y-1.5">
            {showHeatmap && heatmapData && <HeatmapLegend />}
            {hoveredSector && (sectorTerritories.length > 0 || sectorMarkers.length > 0 || (showHeatmap && heatmapData)) && (
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {showHeatmap && heatmapData?.sector_scores?.[hoveredSector] != null && (
                  <span className="font-mono">
                    <Flame className="h-3 w-3 inline mr-1" />
                    THREAT: {heatmapData.sector_scores[hoveredSector]}
                  </span>
                )}
                {sectorTerritories.length > 0 && (
                  <span>
                    <Layers className="h-3 w-3 inline mr-1" />
                    {sectorTerritories.map((t) => t.name).join(", ")}
                  </span>
                )}
                {sectorMarkers.length > 0 && (
                  <span>
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {sectorMarkers.length} marker{sectorMarkers.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-3">
          {/* Threat Predictions */}
          {showHeatmap && heatmapData?.predictions && (
            <ThreatPredictionPanel
              predictions={heatmapData.predictions}
              summary={heatmapData.summary}
              onSectorClick={handleHeatmapSectorClick}
            />
          )}

          <MarkerPanel
            selectedMarker={selectedMarker}
            pendingPosition={pendingPosition}
            onCreateMarker={handleCreateMarker}
            onDeleteMarker={handleDeleteMarker}
            onClose={() => {
              setSelectedMarker(null);
              setPendingPosition(null);
            }}
            markers={visibleMarkers}
            onSelectMarker={handleSelectMarker}
            onStartPlan={handleStartPlan}
          />

          {/* Sector Detail Panel */}
          {hoveredSector && !showPlanner && (
            <SectorDetailPanel
              sector={hoveredSector}
              territories={territories}
              markers={visibleMarkers}
              events={events}
              jobs={availableJobs}
              factions={factions}
            />
          )}

          {/* Mission Planner Overlay */}
          {showPlanner && (
            <MissionPlanOverlay
              availableJobs={availableJobs}
              territories={territories}
              anchorMarker={planAnchor}
              selectedJobs={planJobs}
              onToggleJob={handleTogglePlanJob}
              onClear={() => setPlanJobs([])}
              onClose={() => { setShowPlanner(false); setPlanAnchor(null); setPlanJobs([]); }}
            />
          )}

          {/* Territory legend */}
          {showTerritories && filteredTerritories.length > 0 && (
            <div className="border border-border bg-card rounded-sm overflow-hidden">
              <div className="border-b border-border px-3 py-2 bg-secondary/50">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
                  TERRITORY CONTROL
                </span>
              </div>
              <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                {filteredTerritories.map((t) => {
                  const faction = getFaction(t.controlling_faction_id);
                  return (
                    <div key={t.id} className="flex items-center gap-2 px-2 py-1 text-[10px]">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: faction?.color || "hsl(var(--muted-foreground))" }}
                      />
                      <span className="text-foreground flex-1 truncate">{t.name}</span>
                      <Badge variant="outline" className="text-[8px]">{t.sector}</Badge>
                      <span className="text-muted-foreground uppercase">{t.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}