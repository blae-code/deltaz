import { ROWS, COLS } from "./GridMap";

const NODE_ICONS = {
  food: "🌾",
  water: "💧",
  scrap: "⚙️",
  medical: "💊",
  fuel: "⛽",
  metals: "🔩",
  tech: "💾",
  munitions: "🔫",
  power: "⚡",
  default: "📦",
};

const NODE_COLORS = {
  food: "#4ade80",
  water: "#38bdf8",
  scrap: "#a8a29e",
  medical: "#f87171",
  fuel: "#facc15",
  metals: "#94a3b8",
  tech: "#a78bfa",
  munitions: "#ef4444",
  power: "#fbbf24",
};

export default function ResourceNodeOverlay({ territories }) {
  const nodes = [];

  (territories || []).forEach(t => {
    if (!t.sector || !t.resource_nodes?.length) return;
    const [rowStr, colStr] = t.sector.split("-");
    const row = ROWS.indexOf(rowStr);
    const col = parseInt(colStr) - 1;
    if (row < 0 || col < 0) return;

    t.resource_nodes.forEach((node, idx) => {
      if (node.depleted) return;
      // Distribute nodes within the sector cell
      const offsetX = 30 + (idx % 3) * 25;
      const offsetY = 35 + Math.floor(idx / 3) * 30;
      nodes.push({
        key: `${t.id}-${idx}`,
        x: col * 20 + (offsetX / 100) * 20,
        y: row * 20 + (offsetY / 100) * 20,
        type: node.type,
        yield: node.yield_rate,
        sector: t.sector,
      });
    });
  });

  if (nodes.length === 0) return null;

  return (
    <>
      {nodes.map(n => (
        <div
          key={n.key}
          className="absolute z-[3] pointer-events-none"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative group">
            <div
              className="text-[10px] leading-none"
              style={{ filter: `drop-shadow(0 0 3px ${NODE_COLORS[n.type] || "#888"})` }}
            >
              {NODE_ICONS[n.type] || NODE_ICONS.default}
            </div>
            {n.yield > 0 && (
              <div
                className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[7px] font-mono font-bold px-0.5 rounded-sm"
                style={{ color: NODE_COLORS[n.type] || "#888" }}
              >
                +{n.yield}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}