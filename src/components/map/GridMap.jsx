import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import CornerAccentSvg from "../svg/CornerAccentSvg";

// HumanitZ grid: 5 columns (1-5), 5 rows (A-E)
const COLS = [1, 2, 3, 4, 5];
const ROWS = ["A", "B", "C", "D", "E"];

function getSector(xPct, yPct) {
  const col = Math.min(Math.floor(xPct / 20), 4);
  const row = Math.min(Math.floor(yPct / 20), 4);
  return `${ROWS[row]}-${COLS[col]}`;
}

export default function GridMap({
  children,
  onGridClick,
  selectedSector,
  onSectorHover,
  className,
}) {
  const mapRef = useRef(null);
  const [hoveredSector, setHoveredSector] = useState(null);

  const handleClick = useCallback(
    (e) => {
      if (!mapRef.current || !onGridClick) return;
      const rect = mapRef.current.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      const sector = getSector(xPct, yPct);
      onGridClick({ x: xPct, y: yPct, sector });
    },
    [onGridClick]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      const sector = getSector(xPct, yPct);
      if (sector !== hoveredSector) {
        setHoveredSector(sector);
        onSectorHover?.(sector);
      }
    },
    [hoveredSector, onSectorHover]
  );

  return (
    <div
      ref={mapRef}
      className={cn(
        "relative w-full aspect-square bg-background border border-border tech-grid-bg overflow-hidden cursor-crosshair select-none",
        className
      )}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredSector(null);
        onSectorHover?.(null);
      }}
    >
      {/* Grid lines and labels */}
      {COLS.map((col, ci) => (
        <div key={`col-${col}`}>
          {/* Vertical line */}
          {ci > 0 && (
            <div
              className="absolute top-0 bottom-0 w-px bg-border/40"
              style={{ left: `${ci * 20}%` }}
            />
          )}
          {/* Column label */}
          <div
            className="absolute top-1 text-[9px] text-muted-foreground/60 font-mono tracking-wider z-10"
            style={{ left: `${ci * 20 + 10}%`, transform: "translateX(-50%)" }}
          >
            {col}
          </div>
        </div>
      ))}
      {ROWS.map((row, ri) => (
        <div key={`row-${row}`}>
          {/* Horizontal line */}
          {ri > 0 && (
            <div
              className="absolute left-0 right-0 h-px bg-border/40"
              style={{ top: `${ri * 20}%` }}
            />
          )}
          {/* Row label */}
          <div
            className="absolute left-1 text-[9px] text-muted-foreground/60 font-mono tracking-wider z-10"
            style={{ top: `${ri * 20 + 10}%`, transform: "translateY(-50%)" }}
          >
            {row}
          </div>
        </div>
      ))}

      {/* Sector highlight on hover */}
      {hoveredSector && (() => {
        const row = ROWS.indexOf(hoveredSector.split("-")[0]);
        const col = parseInt(hoveredSector.split("-")[1]) - 1;
        if (row < 0 || col < 0) return null;
        return (
          <div
            className="absolute bg-primary/8 border border-primary/30 shadow-[inset_0_0_12px_hsl(var(--primary)/0.07)] pointer-events-none z-0 transition-all duration-75"
            style={{
              left: `${col * 20}%`,
              top: `${row * 20}%`,
              width: "20%",
              height: "20%",
            }}
          />
        );
      })()}

      {/* Selected sector highlight */}
      {selectedSector && (() => {
        const row = ROWS.indexOf(selectedSector.split("-")[0]);
        const col = parseInt(selectedSector.split("-")[1]) - 1;
        if (row < 0 || col < 0) return null;
        return (
          <div
            className="absolute bg-primary/12 border-2 border-primary/50 shadow-[inset_0_0_20px_hsl(var(--primary)/0.12)] pointer-events-none z-0"
            style={{
              left: `${col * 20}%`,
              top: `${row * 20}%`,
              width: "20%",
              height: "20%",
            }}
          />
        );
      })()}

      {/* Sector label overlay in center */}
      {/* TL + BR corner accent brackets — targeting reticle */}
      <div className="absolute top-0 left-0 z-20 pointer-events-none">
        <CornerAccentSvg corner="tl" size={18} color="hsl(var(--primary) / 0.35)" />
      </div>
      <div className="absolute bottom-0 right-0 z-20 pointer-events-none">
        <CornerAccentSvg corner="br" size={18} color="hsl(var(--primary) / 0.35)" />
      </div>

      {hoveredSector && (
        <div className="absolute top-2 right-2 bg-card/90 border border-primary/30 px-2 py-1 z-20">
          <span className="text-[10px] font-mono text-primary tracking-widest">
            SECTOR {hoveredSector}
          </span>
        </div>
      )}

      {/* Children (pins, markers, territory overlays) */}
      {children}
    </div>
  );
}

export { getSector, ROWS, COLS };