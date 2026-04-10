/**
 * SignalBarsSvg — 4-bar signal strength indicator.
 *
 * @param {0|1|2|3|4} strength - number of active bars
 * @param {number} size - pixel size of the SVG
 * @param {boolean} animated - whether active bars breathe
 * @param {string} activeColor - CSS color string for active bars (defaults to --status-ok)
 * @param {string} className
 */
export default function SignalBarsSvg({
  strength = 3,
  size = 18,
  animated = false,
  activeColor,
  className = "",
}) {
  const fill = activeColor || "hsl(var(--status-ok))";
  const dimFill = "hsl(var(--muted-foreground) / 0.2)";

  // Bars: [x, barHeight, y] — 4 bars of increasing height in a 16×16 viewBox
  const bars = [
    { x: 0, h: 4,  y: 12 },
    { x: 4, h: 7,  y: 9 },
    { x: 8, h: 10, y: 6 },
    { x: 12, h: 13, y: 3 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {bars.map((bar, i) => {
        const isActive = i < strength;
        return (
          <rect
            key={i}
            x={bar.x}
            y={bar.y}
            width={3}
            height={bar.h}
            fill={isActive ? fill : dimFill}
            style={
              animated && isActive
                ? {
                    animation: `bar-fade 1.4s ease-in-out infinite`,
                    animationDelay: `${i * 0.12}s`,
                  }
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}
