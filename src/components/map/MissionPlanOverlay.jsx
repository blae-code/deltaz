import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Route, Crosshair, Coins, MapPin, GripVertical } from "lucide-react";

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function sectorCenter(sector) {
  if (!sector) return null;
  const parts = sector.split("-");
  if (parts.length !== 2) return null;
  const rowIdx = ["A", "B", "C", "D", "E"].indexOf(parts[0].toUpperCase());
  const colIdx = parseInt(parts[1]) - 1;
  if (rowIdx < 0 || isNaN(colIdx) || colIdx < 0) return null;
  return { x: colIdx * 20 + 10, y: rowIdx * 20 + 10 };
}

const DIFFICULTY_COLOR = {
  routine: "text-primary",
  hazardous: "text-status-warn",
  critical: "text-status-danger",
  suicide: "text-status-danger",
};

export default function MissionPlanOverlay({
  availableJobs,
  territories,
  anchorMarker,
  selectedJobs,
  onToggleJob,
  onClear,
  onClose,
}) {
  const [search, setSearch] = useState("");

  // Get anchor coords (marker position)
  const anchorCoords = anchorMarker
    ? { x: anchorMarker.grid_x, y: anchorMarker.grid_y }
    : null;

  // Compute job positions from their territory_id -> territory -> sector -> center
  const jobPositions = useMemo(() => {
    const map = {};
    availableJobs.forEach(job => {
      if (!job.territory_id) return;
      const terr = territories.find(t => t.id === job.territory_id);
      if (!terr?.sector) return;
      const center = sectorCenter(terr.sector);
      if (center) map[job.id] = { ...center, sector: terr.sector, territory_name: terr.name };
    });
    return map;
  }, [availableJobs, territories]);

  // Route calculation: anchor -> job1 -> job2 -> ...
  const routeStats = useMemo(() => {
    if (!anchorCoords || selectedJobs.length === 0) return { totalDist: 0, totalCredits: 0, totalRep: 0, legs: [] };

    const orderedJobs = selectedJobs.map(id => availableJobs.find(j => j.id === id)).filter(Boolean);
    let totalDist = 0;
    let totalCredits = 0;
    let totalRep = 0;
    const legs = [];
    let prev = anchorCoords;

    orderedJobs.forEach(job => {
      const pos = jobPositions[job.id];
      if (pos) {
        const d = distance(prev.x, prev.y, pos.x, pos.y);
        totalDist += d;
        legs.push({ from: prev, to: pos, job, distance: d });
        prev = pos;
      }
      totalCredits += job.reward_credits || 0;
      totalRep += job.reward_reputation || 0;
    });

    return { totalDist, totalCredits, totalRep, legs };
  }, [anchorCoords, selectedJobs, availableJobs, jobPositions]);

  // Filter available jobs for the job picker
  const filteredJobs = availableJobs.filter(j => {
    if (selectedJobs.includes(j.id)) return false;
    if (!search) return true;
    return j.title?.toLowerCase().includes(search.toLowerCase()) ||
           j.type?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="border border-primary/30 bg-card rounded-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-primary/20 px-3 py-2 bg-primary/5">
        <div className="flex items-center gap-1.5">
          <Route className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
            MISSION PLANNER
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Anchor point */}
        <div className="flex items-center gap-2 text-[10px]">
          <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-muted-foreground">RALLY POINT:</span>
          <span className="text-foreground font-semibold">{anchorMarker?.label || "None selected"}</span>
          <Badge variant="outline" className="text-[8px]">{anchorMarker?.sector || "—"}</Badge>
        </div>

        {/* Route summary stats */}
        {selectedJobs.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-border rounded-sm p-2 text-center">
              <div className="text-[7px] text-muted-foreground tracking-widest uppercase font-mono">DISTANCE</div>
              <div className="text-sm font-bold font-display text-primary">{routeStats.totalDist.toFixed(1)}u</div>
            </div>
            <div className="border border-border rounded-sm p-2 text-center">
              <div className="text-[7px] text-muted-foreground tracking-widest uppercase font-mono">CREDITS</div>
              <div className="text-sm font-bold font-display text-accent">{routeStats.totalCredits}c</div>
            </div>
            <div className="border border-border rounded-sm p-2 text-center">
              <div className="text-[7px] text-muted-foreground tracking-widest uppercase font-mono">REP</div>
              <div className="text-sm font-bold font-display text-status-ok">+{routeStats.totalRep}</div>
            </div>
          </div>
        )}

        {/* Selected mission sequence */}
        {selectedJobs.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground tracking-widest uppercase font-mono">
                RUN SEQUENCE ({selectedJobs.length} STOPS)
              </span>
              <button onClick={onClear} className="text-[9px] text-destructive/70 hover:text-destructive font-mono tracking-wider">
                CLEAR ALL
              </button>
            </div>
            {selectedJobs.map((jobId, idx) => {
              const job = availableJobs.find(j => j.id === jobId);
              if (!job) return null;
              const pos = jobPositions[jobId];
              const leg = routeStats.legs[idx];
              return (
                <div key={jobId} className="flex items-center gap-2 border border-border rounded-sm px-2 py-1.5 bg-secondary/20">
                  <span className="text-[9px] font-mono text-primary font-bold w-4 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-foreground truncate block">{job.title}</span>
                    <span className="text-[8px] text-muted-foreground">
                      {pos ? `Sector ${pos.sector}` : "No location"} · {job.reward_credits || 0}c
                      {leg ? ` · ${leg.distance.toFixed(1)}u` : ""}
                    </span>
                  </div>
                  <button onClick={() => onToggleJob(jobId)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Job picker */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-muted-foreground tracking-widest uppercase font-mono">
            ADD MISSIONS
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search missions..."
            className="w-full h-7 text-[10px] bg-muted border border-border rounded-sm px-2 font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="max-h-36 overflow-y-auto space-y-0.5">
            {filteredJobs.length === 0 ? (
              <p className="text-[9px] text-muted-foreground text-center py-2 font-mono">
                {availableJobs.length === 0 ? "No available missions" : "No matches"}
              </p>
            ) : (
              filteredJobs.slice(0, 15).map(job => {
                const pos = jobPositions[job.id];
                return (
                  <button
                    key={job.id}
                    onClick={() => onToggleJob(job.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-sm hover:bg-secondary/40 transition-colors"
                  >
                    <Plus className="h-3 w-3 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-foreground truncate block">{job.title}</span>
                      <span className="text-[8px] text-muted-foreground">
                        {job.type?.toUpperCase()} · {pos ? `Sector ${pos.sector}` : "No location"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[8px] font-mono font-semibold ${DIFFICULTY_COLOR[job.difficulty] || ""}`}>
                        {job.difficulty?.toUpperCase() || "—"}
                      </span>
                      <span className="text-[8px] font-mono text-accent">{job.reward_credits || 0}c</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { sectorCenter };