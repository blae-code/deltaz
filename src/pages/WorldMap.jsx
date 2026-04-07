import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "../hooks/useCurrentUser";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import PageShell from "../components/layout/PageShell";
import StatusStrip from "../components/layout/StatusStrip";
import GridMap from "../components/map/GridMap";
import MapFilterBar from "../components/map/MapFilterBar";
import MapLegend from "../components/map/MapLegend";
import FactionFilter from "../components/map/FactionFilter";
import TerritoryOverlay from "../components/map/TerritoryOverlay";
import ContestedOverlay from "../components/map/ContestedOverlay";
import HeatmapOverlay from "../components/map/HeatmapOverlay";
import ResourceDensityOverlay from "../components/map/ResourceDensityOverlay";
import MissionMarkers from "../components/map/MissionMarkers";
import MapMarkerPin from "../components/map/MapPin";
import MarkerPanel from "../components/map/MarkerPanel";
import SectorDetailPanel from "../components/map/SectorDetailPanel";
import MissionDetailPopup from "../components/map/MissionDetailPopup";
import MissionPlanOverlay from "../components/map/MissionPlanOverlay";
import PlanRouteLines from "../components/map/PlanRouteLines";
import ThreatPredictionPanel from "../components/map/ThreatPredictionPanel";
import InfluenceOverlay from "../components/map/InfluenceOverlay";
import ResourceNodeOverlay from "../components/map/ResourceNodeOverlay";
import ThreatWaveOverlay from "../components/map/ThreatWaveOverlay";
import BasePinOverlay from "../components/map/BasePinOverlay";
import BaseInfluencePanel from "../components/map/BaseInfluencePanel";
import StatusStripSkeleton from "../components/layout/StatusStripSkeleton";
import SkeletonGrid from "../components/terminal/SkeletonGrid";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function WorldMap() {
  const { user } = useCurrentUser();

  // Layer toggles
  const [showTerritories, setShowTerritories] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMissions, setShowMissions] = useState(true);
  const [showResourceDensity, setShowResourceDensity] = useState(false);
  const [showContested, setShowContested] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showInfluence, setShowInfluence] = useState(true);
  const [showResourceNodes, setShowResourceNodes] = useState(false);
  const [showThreatWaves, setShowThreatWaves] = useState(true);
  const [showBases, setShowBases] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [influencePanel, setInfluencePanel] = useState(null);

  // Heatmap state
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [threatPredictions, setThreatPredictions] = useState(null);
  const [threatSummary, setThreatSummary] = useState(null);

  // Selection state
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [pendingPosition, setPendingPosition] = useState(null);
  const [factionFilter, setFactionFilter] = useState(null);

  // Planner state
  const [planAnchor, setPlanAnchor] = useState(null);
  const [planJobs, setPlanJobs] = useState([]);

  // Data queries
  const territoriesQuery = useEntityQuery("territories",
    () => base44.entities.Territory.list("-created_date", 100),
    { subscribeEntities: ["Territory"] }
  );
  const { data: territories = [], syncMeta: mapSyncMeta } = territoriesQuery;
  useRegisterSync("map", territoriesQuery);

  const { data: factions = [] } = useEntityQuery("factions",
    () => base44.entities.Faction.list("-created_date", 50),
    { subscribeEntities: ["Faction"] }
  );
  const { data: markers = [] } = useEntityQuery("markers",
    () => base44.entities.MapMarker.list("-created_date", 200),
    { subscribeEntities: ["MapMarker"] }
  );
  const { data: events = [] } = useEntityQuery("map-events",
    () => base44.entities.Event.list("-created_date", 20),
    { subscribeEntities: ["Event"] }
  );
  const { data: jobs = [] } = useEntityQuery("map-jobs",
    () => base44.entities.Job.list("-created_date", 100),
    { subscribeEntities: ["Job"] }
  );
  const { data: bases = [] } = useEntityQuery("map-bases",
    () => base44.entities.PlayerBase.list("-created_date", 100),
    { subscribeEntities: ["PlayerBase"] }
  );
  const { data: survivors = [] } = useEntityQuery("map-survivors",
    () => base44.entities.Survivor.filter({ status: "active" }),
    { subscribeEntities: ["Survivor"] }
  );

  // Filtered data
  const filteredTerritories = factionFilter
    ? territories.filter(t => t.controlling_faction_id === factionFilter)
    : territories;
  const visibleMarkers = markers.filter(m => m.is_shared || m.created_by === user?.email);
  const availableJobs = jobs.filter(j => j.status === "available");

  // Heatmap toggle
  const toggleHeatmap = useCallback(async () => {
    if (showHeatmap) {
      setShowHeatmap(false);
      return;
    }
    setHeatmapLoading(true);
    setShowHeatmap(true);
    try {
      const res = await base44.functions.invoke("threatAnalysis", {});
      setHeatmapData(res.data?.sector_scores || null);
      setThreatPredictions(res.data?.predictions || null);
      setThreatSummary(res.data?.summary || null);
    } catch {
      // Generate basic heatmap from territory data
      const scores = {};
      territories.forEach(t => {
        if (!t.sector) return;
        const threatScore = { minimal: 5, low: 20, moderate: 40, high: 65, critical: 85 }[t.threat_level] || 10;
        const statusBonus = { contested: 15, hostile: 25 }[t.status] || 0;
        scores[t.sector] = Math.min((scores[t.sector] || 0) + threatScore + statusBonus, 100);
      });
      setHeatmapData(scores);
    }
    setHeatmapLoading(false);
  }, [showHeatmap, territories]);

  // Grid click handler
  const handleGridClick = useCallback(({ x, y, sector }) => {
    if (showPlanner || selectedMission) return;
    setSelectedSector(sector);
    setPendingPosition({ x, y, sector });
    setSelectedMarker(null);
    setSelectedMission(null);
  }, [showPlanner, selectedMission]);

  // Marker CRUD
  const handleCreateMarker = async (data) => {
    await base44.entities.MapMarker.create({ ...data, created_by: user?.email });
    setPendingPosition(null);
  };
  const handleDeleteMarker = async (id) => {
    await base44.entities.MapMarker.delete(id);
    setSelectedMarker(null);
  };

  // Mission select
  const handleMissionSelect = (mission) => {
    setSelectedMission(mission);
    setSelectedMarker(null);
    setPendingPosition(null);
  };

  // Planner
  const handleTogglePlanner = () => {
    setShowPlanner(!showPlanner);
    if (showPlanner) { setPlanAnchor(null); setPlanJobs([]); }
  };
  const handleStartPlan = (marker) => {
    setPlanAnchor(marker);
    setShowPlanner(true);
    setSelectedMarker(null);
  };
  const handleTogglePlanJob = (jobId) => {
    setPlanJobs(prev => prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]);
  };

  // Counts for filter bar
  const waveCount = territories.filter(t => t.active_threat_wave?.status === "incoming").length;
  const counts = {
    territories: filteredTerritories.length,
    markers: visibleMarkers.length,
    missions: availableJobs.length,
    contested: territories.filter(t => t.status === "contested" || t.status === "hostile").length,
  };

  const statusItems = [
    { label: "TERRITORIES", value: territories.length, color: "text-primary" },
    { label: "BASES", value: bases.filter(b => b.status === "active").length, color: "text-foreground" },
    { label: "MISSIONS", value: availableJobs.length, color: "text-accent" },
    { label: "THREATS", value: waveCount, color: waveCount > 0 ? "text-destructive" : "text-foreground" },
  ];

  // Initial loading state — show skeleton matching map layout
  const isInitialLoad = territoriesQuery.isLoading && !territoriesQuery.data;
  if (isInitialLoad) {
    return (
      <PageShell title="Area of Operations" subtitle="Loading tactical map...">
        <StatusStripSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <div className="aspect-square bg-card border border-border rounded-sm animate-pulse" />
          </div>
          <SkeletonGrid count={2} variant="default" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Area of Operations"
      subtitle="Tactical map — territories, markers, missions, and threat data"
      syncMeta={mapSyncMeta}
      onRetry={() => territoriesQuery.refetch()}
      statusStrip={<StatusStrip items={statusItems} />}
    >
      {/* Faction filter */}
      <FactionFilter factions={factions} selectedFactionId={factionFilter} onSelect={setFactionFilter} />

      {/* Collapsible map layers */}
      <div className="border border-border rounded-sm bg-card overflow-hidden">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/30 transition-colors"
        >
          <span className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase">MAP LAYERS & OVERLAYS</span>
          {layersOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </button>
        {layersOpen && (
          <div className="border-t border-border p-2 space-y-2">
            <MapFilterBar
              showTerritories={showTerritories} setShowTerritories={setShowTerritories}
              showMarkers={showMarkers} setShowMarkers={setShowMarkers}
              showHeatmap={showHeatmap} toggleHeatmap={toggleHeatmap} heatmapLoading={heatmapLoading}
              showMissions={showMissions} setShowMissions={setShowMissions}
              showResourceDensity={showResourceDensity} setShowResourceDensity={setShowResourceDensity}
              showContested={showContested} setShowContested={setShowContested}
              showPlanner={showPlanner} onTogglePlanner={handleTogglePlanner}
              selectedMarker={selectedMarker}
              counts={counts}
            />
            <MapLegend
              showHeatmap={showHeatmap} heatmapData={heatmapData}
              showResourceDensity={showResourceDensity}
              showContested={showContested}
              showMissions={showMissions}
            />
          </div>
        )}
      </div>

      {/* Main map + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        <div className="lg:col-span-2 min-w-0">
          <GridMap
            onGridClick={handleGridClick}
            selectedSector={selectedSector}
          >
            {/* Territory zones */}
            {showTerritories && filteredTerritories.map(t => (
              <TerritoryOverlay
                key={t.id}
                territory={t}
                factionColor={factions.find(f => f.id === t.controlling_faction_id)?.color}
              />
            ))}

            {/* Contested overlay */}
            {showContested && <ContestedOverlay territories={territories} />}

            {/* Heatmap */}
            {showHeatmap && heatmapData && (
              <HeatmapOverlay sectorScores={heatmapData} onSectorClick={setSelectedSector} />
            )}

            {/* Resource density */}
            {showResourceDensity && <ResourceDensityOverlay territories={territories} />}

            {/* Influence zones */}
            {showInfluence && <InfluenceOverlay bases={bases} territories={territories} factions={factions} />}

            {/* Resource nodes */}
            {showResourceNodes && <ResourceNodeOverlay territories={territories} />}

            {/* Threat waves */}
            {showThreatWaves && <ThreatWaveOverlay territories={territories} onSectorClick={(s) => { setSelectedSector(s); setInfluencePanel(s); }} />}

            {/* Base pins */}
            {showBases && <BasePinOverlay bases={bases} selectedSector={selectedSector} onBaseClick={(b) => { setSelectedSector(b.sector); setInfluencePanel(b.sector); }} />}

            {/* Mission pins */}
            {showMissions && (
              <MissionMarkers
                jobs={availableJobs}
                territories={territories}
                onSelect={handleMissionSelect}
              />
            )}

            {/* User markers */}
            {showMarkers && visibleMarkers.map(m => (
              <MapMarkerPin
                key={m.id}
                x={m.grid_x}
                y={m.grid_y}
                label={m.label}
                type={m.marker_type}
                isSelected={selectedMarker?.id === m.id}
                onClick={() => { setSelectedMarker(m); setPendingPosition(null); setSelectedMission(null); }}
              />
            ))}

            {/* Plan route lines */}
            {showPlanner && planAnchor && (
              <PlanRouteLines
                anchorMarker={planAnchor}
                selectedJobs={planJobs}
                jobs={availableJobs}
                territories={territories}
              />
            )}
          </GridMap>
        </div>

        {/* Side panel */}
        <div className="space-y-3 min-w-0 overflow-hidden">
          {/* Mission detail */}
          {selectedMission && (
            <MissionDetailPopup
              mission={selectedMission}
              factionName={factions.find(f => f.id === selectedMission.faction_id)?.name}
              onClose={() => setSelectedMission(null)}
            />
          )}

          {/* Marker panel */}
          {(selectedMarker || pendingPosition) && !selectedMission && (
            <MarkerPanel
              selectedMarker={selectedMarker}
              pendingPosition={!selectedMarker ? pendingPosition : null}
              onCreateMarker={handleCreateMarker}
              onDeleteMarker={handleDeleteMarker}
              onClose={() => { setSelectedMarker(null); setPendingPosition(null); }}
              markers={visibleMarkers}
              onSelectMarker={(m) => { setSelectedMarker(m); setPendingPosition(null); }}
              onStartPlan={handleStartPlan}
            />
          )}

          {/* Base influence panel */}
          {influencePanel && !selectedMission && (
            <BaseInfluencePanel
              sector={influencePanel}
              territories={territories}
              bases={bases}
              survivors={survivors}
              factions={factions}
              onClose={() => setInfluencePanel(null)}
            />
          )}

          {/* Sector detail */}
          {selectedSector && !selectedMarker && !pendingPosition && !selectedMission && !influencePanel && (
            <SectorDetailPanel
              sector={selectedSector}
              territories={territories}
              markers={visibleMarkers}
              events={events}
              jobs={jobs}
              factions={factions}
            />
          )}

          {/* Mission planner */}
          {showPlanner && (
            <MissionPlanOverlay
              availableJobs={availableJobs}
              territories={territories}
              anchorMarker={planAnchor}
              selectedJobs={planJobs}
              onToggleJob={handleTogglePlanJob}
              onClear={() => setPlanJobs([])}
              onClose={handleTogglePlanner}
            />
          )}

          {/* Threat predictions */}
          {showHeatmap && threatPredictions && (
            <ThreatPredictionPanel
              predictions={threatPredictions}
              summary={threatSummary}
              onSectorClick={setSelectedSector}
            />
          )}

          {/* Hint when no panel is open */}
          {!selectedMission && !selectedMarker && !pendingPosition && !selectedSector && !showPlanner && !(showHeatmap && threatPredictions) && (
            <div className="border border-dashed border-border rounded-sm py-6 px-4 text-center">
              <p className="text-[11px] text-muted-foreground/60 font-mono">Click a sector on the map to inspect it, or open Map Layers to toggle overlays.</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}