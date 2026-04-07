import { ROWS, COLS } from "./GridMap";

/**
 * InfluenceOverlay — renders colored influence zones around player bases,
 * showing their area of control radiating into adjacent sectors.
 */

function sectorToPos(sector) {
  if (!sector) return null;
  const [rowStr, colStr] = sector.split("-");
  const row = ROWS.indexOf(rowStr);
  const col = parseInt(colStr) - 1;
  if (row < 0 || col < 0 || isNaN(col)) return null;
  return { row, col };
}

function getAdjacentSectors(sector) {
  const pos = sectorToPos(sector);
  if (!pos) return [];
  const adjacent = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = pos.row + dr;
      const nc = pos.col + dc;
      if (nr >= 0 && nr < ROWS.length && nc >= 0 && nc < COLS.length) {
        adjacent.push(`${ROWS[nr]}-${COLS[nc]}`);
      }
    }
  }
  return adjacent;
}

export default function InfluenceOverlay({ bases, territories, factions }) {
  const activeBases = (bases || []).filter(b => b.status === "active" && b.sector);

  // Build influence map: sector -> { color, strength, baseName }
  const influenceMap = {};

  activeBases.forEach(base => {
    // Find faction color from territory or default
    const linkedTerritory = territories.find(t => t.id === base.territory_id);
    const factionId = linkedTerritory?.controlling_faction_id;
    const faction = factions.find(f => f.id === factionId);
    const color = faction?.color || "#22d3ee";

    // Core sector (full strength)
    const defLevel = base.defense_level || 1;
    const coreStrength = Math.min(defLevel * 10, 100);
    if (!influenceMap[base.sector] || influenceMap[base.sector].strength < coreStrength) {
      influenceMap[base.sector] = { color, strength: coreStrength, baseName: base.name, isCore: true };
    }

    // Adjacent sectors (reduced strength based on defense level)
    if (defLevel >= 3) {
      const adjacent = getAdjacentSectors(base.sector);
      const adjStrength = Math.min((defLevel - 2) * 12, 60);
      adjacent.forEach(s => {
        if (!influenceMap[s] || influenceMap[s].strength < adjStrength) {
          influenceMap[s] = { color, strength: adjStrength, baseName: base.name, isCore: false };
        }
      });
    }
  });

  return (
    <>
      {Object.entries(influenceMap).map(([sector, info]) => {
        const pos = sectorToPos(sector);
        if (!pos) return null;
        const opacity = info.isCore
          ? Math.max(0.12, info.strength / 400)
          : Math.max(0.05, info.strength / 600);
        const borderOpacity = info.isCore ? 0.4 : 0.15;

        return (
          <div
            key={`inf-${sector}`}
            className="absolute pointer-events-none z-[1] transition-all duration-500"
            style={{
              left: `${pos.col * 20}%`,
              top: `${pos.row * 20}%`,
              width: "20%",
              height: "20%",
              backgroundColor: info.color,
              opacity,
              border: `1px solid ${info.color}`,
              borderColor: `${info.color}${Math.round(borderOpacity * 255).toString(16).padStart(2, "0")}`,
            }}
          >
            {info.isCore && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="h-2.5 w-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: info.color, opacity: 0.6 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export { sectorToPos, getAdjacentSectors };