import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "../hooks/useCurrentUser";
import useEntityQuery from "../hooks/useEntityQuery";
import { useRegisterSync } from "../hooks/useSyncRegistry";
import PageShell from "../components/layout/PageShell";
import StatusStrip from "../components/layout/StatusStrip";
import GridMap from "../components/map/GridMap";
import MapMarkerPin from "../components/map/MapPin";
import MarkerPanel from "../components/map/MarkerPanel";
import BasePinOverlay from "../components/map/BasePinOverlay";
import BaseInfluencePanel from "../components/map/BaseInfluencePanel";
import SectorDetailPanel from "../components/map/SectorDetailPanel";
import StatusStripSkeleton from "../components/layout/StatusStripSkeleton";

export default function WorldMap() {
  const { user } = useCurrentUser();

  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [pendingPosition, setPendingPosition] = useState(null);
  const [influencePanel, setInfluencePanel] = useState(null);

  // Player markers (own + shared)
  const markersQuery = useEntityQuery("markers",
    () => base44.entities.MapMarker.list("-created_date", 200),
    { subscribeEntities: ["MapMarker"] }
  );
  const { data: allMarkers = [] } = markersQuery;
  useRegisterSync("map", markersQuery);

  // Player bases
  const basesQuery = useEntityQuery("map-bases",
    () => base44.entities.PlayerBase.list("-created_date", 100),
    { subscribeEntities: ["PlayerBase"] }
  );
  const { data: bases = [] } = basesQuery;

  // Survivors (for base panel detail)
  const { data: survivors = [] } = useEntityQuery("map-survivors",
    () => base44.entities.Survivor.filter({ status: "active" }),
    { subscribeEntities: ["Survivor"] }
  );

  const visibleMarkers = allMarkers.filter(m => m.is_shared || m.created_by === user?.email);

  const handleGridClick = useCallback(({ x, y, sector }) => {
    setSelectedSector(sector);
    setPendingPosition({ x, y, sector });
    setSelectedMarker(null);
  }, []);

  const handleCreateMarker = async (data) => {
    await base44.entities.MapMarker.create({ ...data, created_by: user?.email });
    setPendingPosition(null);
  };

  const handleDeleteMarker = async (id) => {
    await base44.entities.MapMarker.delete(id);
    setSelectedMarker(null);
  };

  const statusItems = [
    { label: "MY MARKERS", value: allMarkers.filter(m => m.created_by === user?.email).length, color: "text-primary" },
    { label: "SHARED",     value: allMarkers.filter(m => m.is_shared && m.created_by !== user?.email).length, color: "text-foreground" },
    { label: "BASES",      value: bases.filter(b => b.status === "active").length, color: "text-accent" },
  ];

  const isInitialLoad = markersQuery.isLoading && !markersQuery.data;
  if (isInitialLoad) {
    return (
      <PageShell title="Area of Operations" subtitle="Loading tactical map...">
        <StatusStripSkeleton count={3} />
        <div className="aspect-square max-h-[600px] bg-card border border-border animate-pulse" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Area of Operations"
      subtitle="Personal map markers and base locations"
      syncMeta={markersQuery.syncMeta}
      onRetry={() => markersQuery.refetch()}
      statusStrip={<StatusStrip items={statusItems} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        <div className="lg:col-span-2 min-w-0">
          <GridMap onGridClick={handleGridClick} selectedSector={selectedSector}>
            {/* Base pins */}
            <BasePinOverlay
              bases={bases}
              selectedSector={selectedSector}
              onBaseClick={(b) => { setSelectedSector(b.sector); setInfluencePanel(b.sector); }}
            />

            {/* Player markers */}
            {visibleMarkers.map(m => (
              <MapMarkerPin
                key={m.id}
                x={m.grid_x}
                y={m.grid_y}
                label={m.label}
                type={m.marker_type}
                isSelected={selectedMarker?.id === m.id}
                onClick={() => { setSelectedMarker(m); setPendingPosition(null); }}
              />
            ))}
          </GridMap>
        </div>

        {/* Side panel */}
        <div className="space-y-3 min-w-0 overflow-hidden">
          {/* Marker panel — edit/create */}
          {(selectedMarker || pendingPosition) && (
            <MarkerPanel
              selectedMarker={selectedMarker}
              pendingPosition={!selectedMarker ? pendingPosition : null}
              onCreateMarker={handleCreateMarker}
              onDeleteMarker={handleDeleteMarker}
              onClose={() => { setSelectedMarker(null); setPendingPosition(null); }}
              markers={visibleMarkers}
              onSelectMarker={(m) => { setSelectedMarker(m); setPendingPosition(null); }}
            />
          )}

          {/* Base detail panel */}
          {influencePanel && !selectedMarker && !pendingPosition && (
            <BaseInfluencePanel
              sector={influencePanel}
              territories={[]}
              bases={bases}
              survivors={survivors}
              factions={[]}
              onClose={() => setInfluencePanel(null)}
            />
          )}

          {/* Sector detail — no marker selected */}
          {selectedSector && !selectedMarker && !pendingPosition && !influencePanel && (
            <SectorDetailPanel
              sector={selectedSector}
              territories={[]}
              markers={visibleMarkers}
              events={[]}
              jobs={[]}
              factions={[]}
            />
          )}

          {/* Hint when nothing selected */}
          {!selectedMarker && !pendingPosition && !selectedSector && !influencePanel && (
            <div className="border border-dashed border-border/50 py-6 px-4 text-center">
              <p className="text-[11px] text-muted-foreground/60 font-mono">
                Click any sector to drop a marker or view sector info.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
