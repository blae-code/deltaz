import { Shield } from "lucide-react";

/**
 * BasePinOverlay — plots player bases as pins on the grid map.
 */
export default function BasePinOverlay({ bases, selectedSector, onBaseClick }) {
  const activeBases = (bases || []).filter(b => b.status === "active" && b.grid_x != null && b.grid_y != null);

  return (
    <>
      {activeBases.map(base => {
        const isInSelected = base.sector === selectedSector;
        return (
          <div
            key={base.id}
            className="absolute z-[4] cursor-pointer"
            style={{
              left: `${base.grid_x}%`,
              top: `${base.grid_y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onBaseClick?.(base);
            }}
          >
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm border text-[8px] font-mono font-bold transition-colors ${
              isInSelected
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-card/80 border-border text-foreground hover:border-primary/30"
            }`}>
              <Shield className="h-2.5 w-2.5" />
              <span className="truncate max-w-[50px]">{base.name}</span>
              <span className="text-muted-foreground">L{base.defense_level || 1}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}