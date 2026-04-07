import { ROWS } from "./GridMap";

function getHeatColor(score) {
  if (score >= 70) return { bg: "rgba(197, 48, 48, 0.45)", border: "rgba(197, 48, 48, 0.7)", text: "#c53030" };
  if (score >= 50) return { bg: "rgba(196, 123, 42, 0.35)", border: "rgba(196, 123, 42, 0.6)", text: "#c47b2a" };
  if (score >= 30) return { bg: "rgba(212, 161, 58, 0.25)", border: "rgba(212, 161, 58, 0.5)", text: "#d4a13a" };
  if (score >= 15) return { bg: "rgba(223, 129, 22, 0.12)", border: "rgba(223, 129, 22, 0.3)", text: "#df8116" };
  return { bg: "rgba(223, 129, 22, 0.05)", border: "rgba(223, 129, 22, 0.12)", text: "rgba(223, 129, 22, 0.5)" };
}

export default function HeatmapOverlay({ sectorScores, onSectorClick }) {
  if (!sectorScores) return null;

  return (
    <>
      {Object.entries(sectorScores).map(([sector, score]) => {
        const parts = sector.split("-");
        if (parts.length !== 2) return null;
        const rowIdx = ROWS.indexOf(parts[0]);
        const colIdx = parseInt(parts[1]) - 1;
        if (rowIdx < 0 || colIdx < 0 || colIdx > 4) return null;

        const colors = getHeatColor(score);

        return (
          <div
            key={`heat-${sector}`}
            className="absolute z-[1] transition-all duration-500 cursor-pointer"
            style={{
              left: `${colIdx * 20}%`,
              top: `${rowIdx * 20}%`,
              width: "20%",
              height: "20%",
              backgroundColor: colors.bg,
              borderColor: colors.border,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSectorClick?.(sector);
            }}
          >
            {/* Score label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-[11px] font-mono font-bold opacity-80"
                style={{ color: colors.text }}
              >
                {score}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}