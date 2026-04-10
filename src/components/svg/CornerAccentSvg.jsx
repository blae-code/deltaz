/**
 * CornerAccentSvg — L-shaped corner bracket accent.
 *
 * @param {"tl"|"tr"|"bl"|"br"} corner - which corner to render
 * @param {number} size - pixel size of the square SVG
 * @param {string} color - stroke color (defaults to primary at 40% opacity)
 * @param {string} className
 */
export default function CornerAccentSvg({ size = 16, corner = "tr", color, className = "" }) {
  const c = color || "hsl(var(--primary) / 0.4)";
  const rotations = { tl: 0, tr: 90, br: 180, bl: 270 };
  const deg = rotations[corner] ?? 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={deg !== 0 ? { transform: `rotate(${deg}deg)` } : undefined}
      aria-hidden="true"
    >
      {/* Vertical arm of the L */}
      <line x1="2.5" y1="2" x2="2.5" y2="10" stroke={c} strokeWidth="1.5" strokeLinecap="square" />
      {/* Horizontal arm of the L */}
      <line x1="2" y1="2.5" x2="10" y2="2.5" stroke={c} strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}
