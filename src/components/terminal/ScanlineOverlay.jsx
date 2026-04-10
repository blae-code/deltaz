/**
 * ScanlineOverlay — two-layer CRT effect:
 *  1. Static fine raster (repeating horizontal lines, opacity 3%)
 *  2. Slow animated sweep band that travels top→bottom every 18s
 */
export default function ScanlineOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Static raster lines — very subtle */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(223,145,30,0.03) 2px, rgba(223,145,30,0.03) 4px)",
        }}
      />
      {/* Animated sweep band */}
      <div className="crt-scanline" aria-hidden="true" />
    </div>
  );
}