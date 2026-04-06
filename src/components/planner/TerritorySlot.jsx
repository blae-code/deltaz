import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, X, Swords } from "lucide-react";

const threatColors = {
  minimal: "text-status-ok border-status-ok/30",
  low: "text-status-ok border-status-ok/30",
  moderate: "text-status-warn border-status-warn/30",
  high: "text-status-danger border-status-danger/30",
  critical: "text-status-danger border-status-danger/30",
};
const statusColors = {
  secured: "border-status-ok/20 bg-status-ok/5",
  uncharted: "border-muted-foreground/20 bg-muted/10",
  contested: "border-status-warn/20 bg-status-warn/5",
  hostile: "border-status-danger/20 bg-status-danger/5",
};

export default function TerritorySlot({ territory, faction, assignedSurvivors, onRemoveSurvivor }) {
  if (!territory) return null;

  return (
    <div className={`border rounded-sm overflow-hidden ${statusColors[territory.status] || "border-border"}`}>
      {/* Territory header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-mono font-semibold text-foreground truncate">{territory.name}</p>
            <p className="text-[8px] text-muted-foreground">
              Sector {territory.sector} · {territory.status}
              {faction && <> · <span style={{ color: faction.color }}>[{faction.tag}]</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[7px] ${threatColors[territory.threat_level] || ""}`}>
            <AlertTriangle className="h-2 w-2 mr-0.5" />
            {territory.threat_level}
          </Badge>
        </div>
      </div>

      {/* Drop zone for survivors */}
      <Droppable droppableId={`territory-${territory.id}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef} {...provided.droppableProps}
            className={`min-h-[80px] p-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/10 ring-1 ring-primary/30" : ""
            }`}
          >
            {assignedSurvivors.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-[60px] border border-dashed border-border/50 rounded-sm">
                <p className="text-[9px] text-muted-foreground/50 font-mono">DROP OPERATIVES HERE</p>
              </div>
            )}
            <div className="space-y-1">
              {assignedSurvivors.map((s, index) => (
                <Draggable key={s.id} draggableId={s.id} index={index}>
                  {(drag, snap) => (
                    <div
                      ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}
                      className={`flex items-center justify-between border rounded-sm px-2 py-1.5 cursor-grab ${
                        snap.isDragging
                          ? "border-primary bg-primary/10 shadow-lg"
                          : "border-primary/30 bg-primary/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-5 w-5 rounded-sm bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-primary">{(s.name || "?")[0]}</span>
                        </div>
                        <span className="text-[10px] font-mono text-foreground truncate">{s.name}</span>
                        <span className="text-[8px] text-muted-foreground uppercase">{s.skill}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Swords className="h-2.5 w-2.5 text-accent" />
                        <span className="text-[8px] text-accent font-mono">{s.combat_rating || 1}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveSurvivor(s.id); }}
                          className="text-muted-foreground hover:text-destructive ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Resources summary */}
      {territory.resources?.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border/30 bg-secondary/10">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[7px] text-muted-foreground uppercase tracking-wider">Resources:</span>
            {territory.resources.map(r => (
              <Badge key={r} variant="outline" className="text-[7px]">{r}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}