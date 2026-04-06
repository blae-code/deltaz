import { ROWS } from "./GridMap";

export default function ContestedOverlay({ territories }) {
  const contested = territories.filter(t => t.status === "contested" || t.status === "hostile");

  return (
    <>
      {contested.map(t => {
        if (!t.sector) return null;
        const parts = t.sector.split("-");
        if (parts.length !== 2) return null;
        const rowIdx = ROWS.indexOf(parts[0].toUpperCase());
        const colIdx = parseInt(parts[1]) - 1;
        if (rowIdx < 0 || colIdx < 0 || colIdx > 4) return null;

        const isHostile = t.status === "hostile";

        return (
          <div
            key={`contested-${t.id}`}
            className="absolute pointer-events-none z-[2]"
            style={{
              left: `${colIdx * 20}%`,
              top: `${rowIdx * 20}%`,
              width: "20%",
              height: "20%",
            }}
          >
            {/* Animated border for contested zones */}
            <div
              className="absolute inset-0 border-2 animate-pulse"
              style={{
                borderColor: isHostile ? "rgba(197, 48, 48, 0.6)" : "rgba(212, 161, 58, 0.6)",
                borderStyle: "dashed",
                backgroundColor: isHostile ? "rgba(197, 48, 48, 0.08)" : "rgba(212, 161, 58, 0.06)",
              }}
            />
            {/* Status badge */}
            <div className="absolute top-1 left-1 z-10">
              <span
                className="text-[7px] font-mono font-bold uppercase px-1 py-0.5 rounded-sm"
                style={{
                  backgroundColor: isHostile ? "rgba(197, 48, 48, 0.3)" : "rgba(212, 161, 58, 0.3)",
                  color: isHostile ? "#c53030" : "#d4a13a",
                }}
              >
                {t.status}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}