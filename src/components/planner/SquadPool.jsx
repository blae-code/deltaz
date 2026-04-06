import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Heart, Swords, Brain, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const healthColors = {
  peak: "text-status-ok", healthy: "text-status-ok", sick: "text-status-warn",
  injured: "text-status-danger", critical: "text-status-danger",
};
const moraleColors = {
  thriving: "text-status-ok", content: "text-status-ok", neutral: "text-muted-foreground",
  anxious: "text-status-warn", desperate: "text-status-danger",
};

// SAFETY: Reads Survivor entity. Fields: name, skill, skill_level, health, morale, combat_rating, status.
// All access below uses defensive defaults for missing fields.
export default function SquadPool({ survivors: rawSurvivors, assignedIds: rawIds }) {
  const survivors = Array.isArray(rawSurvivors) ? rawSurvivors : [];
  const assignedIds = Array.isArray(rawIds) ? rawIds : [];
  const [search, setSearch] = useState("");

  const available = survivors
    .filter(s => !assignedIds.includes(s.id) && s.status === "active")
    .filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.skill?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden h-full flex flex-col">
      <div className="border-b border-border px-3 py-2 bg-secondary/50">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          Available Operatives ({available.length})
        </h3>
      </div>
      <div className="px-2 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name or skill..."
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono pl-7"
          />
        </div>
      </div>
      <Droppable droppableId="squad-pool">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef} {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[100px] transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
          >
            {available.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-4">
                {survivors.length === 0 ? "No survivors recruited yet" : "All operatives assigned or filtered out"}
              </p>
            )}
            {available.map((s, index) => (
              <Draggable key={s.id} draggableId={s.id} index={index}>
                {(drag, snap) => (
                  <div
                    ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}
                    className={`border rounded-sm p-2 cursor-grab active:cursor-grabbing transition-all ${
                      snap.isDragging
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-105"
                        : "border-border bg-secondary/20 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-6 w-6 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-primary">{(s.name || "?")[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono font-semibold text-foreground truncate">{s.name}</p>
                          <p className="text-[8px] text-muted-foreground uppercase">{s.skill} Lv.{s.skill_level || 1}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-0.5" title={`Combat: ${s.combat_rating || 1}`}>
                          <Swords className="h-2.5 w-2.5 text-accent" />
                          <span className="text-[8px] font-mono text-accent">{s.combat_rating || 1}</span>
                        </div>
                        <Heart className={`h-2.5 w-2.5 ${healthColors[s.health] || "text-muted-foreground"}`} />
                        <Brain className={`h-2.5 w-2.5 ${moraleColors[s.morale] || "text-muted-foreground"}`} />
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}