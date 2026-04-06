import { ROWS } from "./GridMap";

const resourceColors = {
  fuel: "rgba(212, 161, 58, 0.5)",
  metals: "rgba(148, 163, 184, 0.5)",
  tech: "rgba(91, 168, 200, 0.5)",
  food: "rgba(45, 212, 160, 0.5)",
  munitions: "rgba(197, 48, 48, 0.5)",
};

export default function ResourceDensityOverlay({ territories }) {
  // Build a map of sector -> resource counts
  const sectorResources = {};
  territories.forEach(t => {
    if (!t.sector || !t.resources?.length) return;
    if (!sectorResources[t.sector]) sectorResources[t.sector] = [];
    sectorResources[t.sector].push(...t.resources);
  });

  return (
    <>
      {Object.entries(sectorResources).map(([sector, resources]) => {
        const parts = sector.split("-");
        if (parts.length !== 2) return null;
        const rowIdx = ROWS.indexOf(parts[0].toUpperCase());
        const colIdx = parseInt(parts[1]) - 1;
        if (rowIdx < 0 || colIdx < 0 || colIdx > 4) return null;

        const uniqueResources = [...new Set(resources)];
        const density = Math.min(resources.length, 8);
        const primaryResource = uniqueResources[0];
        const bgColor = resourceColors[primaryResource] || "rgba(45, 212, 160, 0.3)";

        return (
          <div
            key={`res-${sector}`}
            className="absolute pointer-events-none z-[1] flex flex-col items-center justify-center"
            style={{
              left: `${colIdx * 20}%`,
              top: `${rowIdx * 20}%`,
              width: "20%",
              height: "20%",
              backgroundColor: `${bgColor.slice(0, -4)}${(0.05 + density * 0.04).toFixed(2)})`,
              borderColor: bgColor,
              borderWidth: "1px",
              borderStyle: "dashed",
            }}
          >
            {/* Resource dots */}
            <div className="flex gap-0.5 flex-wrap justify-center max-w-[80%]">
              {uniqueResources.slice(0, 4).map((r, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: resourceColors[r] || "#5ba8c8" }}
                  title={r}
                />
              ))}
            </div>
            <span className="text-[7px] font-mono mt-0.5 opacity-60 text-foreground uppercase">
              {uniqueResources.length} res
            </span>
          </div>
        );
      })}
    </>
  );
}