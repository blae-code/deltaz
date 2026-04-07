/**
 * CompassSvg — Wasteland compass/navigation icon for world conditions and map areas.
 */
export default function CompassSvg({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring */}
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      {/* Cardinal tick marks */}
      <line x1="20" y1="2" x2="20" y2="6" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="20" y1="34" x2="20" y2="38" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="2" y1="20" x2="6" y2="20" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="34" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      {/* Intercardinal ticks */}
      <line x1="7.3" y1="7.3" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      <line x1="30.5" y1="9.5" x2="32.7" y2="7.3" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      <line x1="7.3" y1="32.7" x2="9.5" y2="30.5" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      <line x1="30.5" y1="30.5" x2="32.7" y2="32.7" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      {/* Compass needle — north (filled) */}
      <polygon points="20,8 18,20 22,20" fill="currentColor" opacity="0.6" />
      {/* Compass needle — south (outline) */}
      <polygon points="20,32 18,20 22,20" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
      {/* Center pin */}
      <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="20" cy="20" r="1" fill="currentColor" opacity="0.8" />
      {/* Cardinal labels */}
      <text x="20" y="5.5" textAnchor="middle" fontSize="4" fill="currentColor" opacity="0.4" fontFamily="monospace" fontWeight="bold">N</text>
      <text x="20" y="38" textAnchor="middle" fontSize="4" fill="currentColor" opacity="0.3" fontFamily="monospace">S</text>
      <text x="37.5" y="21.5" textAnchor="middle" fontSize="4" fill="currentColor" opacity="0.3" fontFamily="monospace">E</text>
      <text x="2.5" y="21.5" textAnchor="middle" fontSize="4" fill="currentColor" opacity="0.3" fontFamily="monospace">W</text>
    </svg>
  );
}