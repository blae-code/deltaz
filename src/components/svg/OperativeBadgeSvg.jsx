/**
 * OperativeBadgeSvg — Military-style ID badge frame for operative cards.
 * Enhanced: animated rotating dashed outer ring + breathing glow halo.
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
      {/* Breathing glow halo — pulsing circle behind the octagon */}
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke={color}
        strokeWidth="6"
        opacity="0"
        style={{
          animation: "badge-ring-pulse 3.5s ease-in-out infinite",
          transformOrigin: "24px 24px",
        }}
      />

      {/* Slow rotating dashed outer ring */}
      <circle
        cx="24"
        cy="24"
        r="22.5"
        stroke={color}
        strokeWidth="0.6"
        strokeDasharray="2.5 4.5"
        opacity="0.25"
        style={{
          animation: "badge-spin 22s linear infinite",
          transformOrigin: "24px 24px",
        }}
      />

      {/* Outer octagonal frame */}
      <path
        d="M14 4H34L44 14V34L34 44H14L4 34V14L14 4Z"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.45"
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

      {/* Corner tick accents — four diagonal corners */}
      <line x1="4"  y1="14" x2="8"  y2="14" stroke={color} strokeWidth="1.5" opacity="0.35" />
      <line x1="14" y1="4"  x2="14" y2="8"  stroke={color} strokeWidth="1.5" opacity="0.35" />
      <line x1="44" y1="14" x2="40" y2="14" stroke={color} strokeWidth="1.5" opacity="0.35" />
      <line x1="34" y1="4"  x2="34" y2="8"  stroke={color} strokeWidth="1.5" opacity="0.35" />
      <line x1="4"  y1="34" x2="8"  y2="34" stroke={color} strokeWidth="1.0" opacity="0.2" />
      <line x1="14" y1="44" x2="14" y2="40" stroke={color} strokeWidth="1.0" opacity="0.2" />
      <line x1="44" y1="34" x2="40" y2="34" stroke={color} strokeWidth="1.0" opacity="0.2" />
      <line x1="34" y1="44" x2="34" y2="40" stroke={color} strokeWidth="1.0" opacity="0.2" />

      {/* Horizontal crosshair rule */}
      <line x1="6" y1="24" x2="12" y2="24" stroke={color} strokeWidth="0.5" opacity="0.2" />
      <line x1="36" y1="24" x2="42" y2="24" stroke={color} strokeWidth="0.5" opacity="0.2" />

      {/* Initial letter */}
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fontFamily="var(--font-display), Rajdhani, sans-serif"
        fill={color}
        opacity="0.9"
      >
        {initial}
      </text>

      {/* Bottom rank bar — two segments */}
      <line x1="17" y1="36" x2="23" y2="36" stroke={color} strokeWidth="1" opacity="0.3" />
      <line x1="25" y1="36" x2="31" y2="36" stroke={color} strokeWidth="1" opacity="0.15" />
    </svg>
  );
}
