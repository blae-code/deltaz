import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, MapPin, Trash2, Share2, Eye, EyeOff, Route } from "lucide-react";
import moment from "moment";

const MARKER_TYPES = [
  { value: "poi", label: "POI" },
  { value: "danger", label: "DANGER" },
  { value: "loot", label: "LOOT" },
  { value: "base", label: "BASE" },
  { value: "mission", label: "MISSION" },
  { value: "custom", label: "CUSTOM" },
];

export default function MarkerPanel({
  selectedMarker,
  pendingPosition,
  onCreateMarker,
  onDeleteMarker,
  onClose,
  markers,
  onSelectMarker,
  onStartPlan,
}) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [markerType, setMarkerType] = useState("custom");
  const [isShared, setIsShared] = useState(true);

  const handleCreate = () => {
    if (!label || !pendingPosition) return;
    onCreateMarker({
      label,
      description,
      marker_type: markerType,
      grid_x: pendingPosition.x,
      grid_y: pendingPosition.y,
      sector: pendingPosition.sector,
      is_shared: isShared,
    });
    setLabel("");
    setDescription("");
    setMarkerType("custom");
  };

  // Viewing a selected marker
  if (selectedMarker) {
    return (
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/50">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
            MARKER INTEL
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{selectedMarker.label}</span>
            <Badge variant="outline" className="text-[9px] uppercase">{selectedMarker.marker_type}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="border border-border rounded-sm p-2">
              <div className="text-muted-foreground">SECTOR</div>
              <div className="text-foreground font-semibold">{selectedMarker.sector || "—"}</div>
            </div>
            <div className="border border-border rounded-sm p-2">
              <div className="text-muted-foreground">COORDS</div>
              <div className="text-foreground font-semibold">
                {selectedMarker.grid_x?.toFixed(1)}, {selectedMarker.grid_y?.toFixed(1)}
              </div>
            </div>
          </div>
          {selectedMarker.description && (
            <p className="text-[11px] text-muted-foreground">{selectedMarker.description}</p>
          )}
          <div className="text-[9px] text-muted-foreground">
            Placed by {selectedMarker.created_by} · {moment(selectedMarker.created_date).fromNow()}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[9px] text-muted-foreground"
              onClick={() => {
                const text = `📍 ${selectedMarker.label} — Sector ${selectedMarker.sector} (${selectedMarker.grid_x?.toFixed(1)}, ${selectedMarker.grid_y?.toFixed(1)})`;
                navigator.clipboard.writeText(text);
              }}
            >
              <Share2 className="h-3 w-3 mr-1" />COPY COORDS
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[9px] text-primary"
              onClick={() => onStartPlan?.(selectedMarker)}
            >
              <Route className="h-3 w-3 mr-1" />PLAN RUN
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[9px] text-destructive"
              onClick={() => onDeleteMarker(selectedMarker.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />DELETE
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Creating a new marker
  if (pendingPosition) {
    return (
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/50">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
            DROP MARKER — {pendingPosition.sector}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            Place a marker at this location. Shared markers are visible to all operatives; private ones are for your eyes only.
          </p>
          <div>
            <Label className="text-[10px] font-mono">LABEL</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="E.g. Loot Cache, Danger Zone..."
              className="h-7 text-xs bg-muted mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-mono">TYPE</Label>
              <Select value={markerType} onValueChange={setMarkerType}>
                <SelectTrigger className="h-7 text-[10px] bg-muted mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-mono">VISIBILITY</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] w-full mt-1 justify-start"
                onClick={() => setIsShared(!isShared)}
              >
                {isShared ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                {isShared ? "SHARED" : "PRIVATE"}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-[10px] font-mono">NOTES</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional intel..."
              className="text-xs bg-muted mt-1"
              rows={2}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!label}
            className="w-full h-7 text-[10px] font-mono tracking-wider"
            size="sm"
          >
            <Plus className="h-3 w-3 mr-1" /> DROP MARKER
          </Button>
        </div>
      </div>
    );
  }

  // Marker list
  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          MARKERS ({markers.length})
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {markers.length === 0 ? (
          <div className="p-4 text-center space-y-1.5">
            <MapPin className="h-5 w-5 text-muted-foreground/50 mx-auto" />
            <p className="text-[10px] text-foreground font-semibold">No markers placed yet</p>
            <p className="text-[9px] text-muted-foreground/60 leading-relaxed max-w-[200px] mx-auto">
              Click any grid cell on the map to drop a marker — tag loot spots, danger zones, or mission waypoints for your squad.
            </p>
          </div>
        ) : (
          markers.map((m) => (
            <button
              key={m.id}
              className="w-full flex items-center gap-2 px-3 py-2 text-left border-b border-border/50 hover:bg-secondary/30 transition-colors"
              onClick={() => onSelectMarker(m)}
            >
              <MapPin className="h-3 w-3 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] text-foreground truncate block">{m.label}</span>
                <span className="text-[9px] text-muted-foreground">{m.sector} · {m.marker_type}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}