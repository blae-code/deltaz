import { sectorCenter } from "./MissionPlanOverlay";

export default function PlanRouteLines({ anchorMarker, selectedJobs, jobs, territories }) {
  if (!anchorMarker || selectedJobs.length === 0) return null;

  const anchorCoords = { x: anchorMarker.grid_x, y: anchorMarker.grid_y };

  // Build waypoints: anchor -> job1 -> job2 -> ...
  const waypoints = [anchorCoords];
  selectedJobs.forEach(jobId => {
    const job = jobs.find(j => j.id === jobId);
    if (!job?.territory_id) return;
    const terr = territories.find(t => t.id === job.territory_id);
    if (!terr?.sector) return;
    const center = sectorCenter(terr.sector);
    if (center) waypoints.push(center);
  });

  if (waypoints.length < 2) return null;

  return (
    <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
      <defs>
        <marker id="routeArrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="none" stroke="hsl(32, 82%, 48%)" strokeWidth="1" />
        </marker>
      </defs>
      {waypoints.map((wp, i) => {
        if (i === 0) return null;
        const prev = waypoints[i - 1];
        return (
          <line
            key={i}
            x1={`${prev.x}%`}
            y1={`${prev.y}%`}
            x2={`${wp.x}%`}
            y2={`${wp.y}%`}
            stroke="hsl(32, 82%, 48%)"
            strokeWidth="2"
            strokeDasharray="6 3"
            strokeOpacity="0.7"
            markerEnd="url(#routeArrow)"
          />
        );
      })}
      {/* Waypoint dots */}
      {waypoints.map((wp, i) => (
        <circle
          key={`dot-${i}`}
          cx={`${wp.x}%`}
          cy={`${wp.y}%`}
          r={i === 0 ? 5 : 4}
          fill={i === 0 ? "hsl(38, 85%, 55%)" : "hsl(32, 82%, 48%)"}
          stroke="hsl(230, 20%, 5%)"
          strokeWidth="1.5"
        />
      ))}
      {/* Step numbers */}
      {waypoints.map((wp, i) => {
        if (i === 0) return null;
        return (
          <text
            key={`num-${i}`}
            x={`${wp.x}%`}
            y={`${wp.y}%`}
            dy="-8"
            textAnchor="middle"
            fill="hsl(32, 82%, 48%)"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
          >
            {i}
          </text>
        );
      })}
    </svg>
  );
}