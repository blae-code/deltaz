/**
 * OperativeBadgeSvg — Military-style ID badge frame for operative cards.
 */
export default function OperativeBadgeSvg({ size = 44, initial = "?", factionColor, className = "" }) {
  const color = factionColor || "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer octagonal frame */}
      <path
        d="M14 4H34L44 14V34L34 44H14L4 34V14L14 4Z"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.4"
      />
      {/* Inner frame */}
      <path
        d="M16 8H32L40 16V32L32 40H16L8 32V16L16 8Z"
        stroke={color}
        strokeWidth="0.8"
        opacity="0.2"
        fill={color}
        fillOpacity="0.05"
      />
      {/* Corner accents */}
      <line x1="4" y1="14" x2="8" y2="14" stroke={color} strokeWidth="1.5" opacity="0.3" />
      <line x1="14" y1="4" x2="14" y2="8" stroke={color} strokeWidth="1.5" opacity="0.3" />
      <line x1="44" y1="14" x2="40" y2="14" stroke={color} strokeWidth="1.5" opacity="0.3" />
      <line x1="34" y1="4" x2="34" y2="8" stroke={color} strokeWidth="1.5" opacity="0.3" />
      {/* Initial letter */}
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fontFamily="var(--font-display), Rajdhani, sans-serif"
        fill={color}
        opacity="0.85"
      >
        {initial}
      </text>
      {/* Bottom rank bar */}
      <line x1="18" y1="36" x2="30" y2="36" stroke={color} strokeWidth="1" opacity="0.25" />
    </svg>
  );
}