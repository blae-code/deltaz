/**
 * SettlementSvg — Small settlement/base icon for colony sections.
 */
export default function SettlementSvg({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ground line */}
      <line x1="2" y1="26" x2="30" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2" />
      {/* Main structure */}
      <rect x="10" y="14" width="12" height="12" stroke="currentColor" strokeWidth="1" opacity="0.4" fill="currentColor" fillOpacity="0.04" />
      {/* Roof */}
      <path d="M8 14L16 7L24 14" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      {/* Door */}
      <rect x="14" y="20" width="4" height="6" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      {/* Window left */}
      <rect x="11.5" y="16" width="3" height="2.5" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
      {/* Window right */}
      <rect x="17.5" y="16" width="3" height="2.5" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
      {/* Watchtower */}
      <rect x="25" y="16" width="4" height="10" stroke="currentColor" strokeWidth="0.7" opacity="0.25" />
      <line x1="25" y1="16" x2="27" y2="12" stroke="currentColor" strokeWidth="0.7" opacity="0.25" />
      <line x1="29" y1="16" x2="27" y2="12" stroke="currentColor" strokeWidth="0.7" opacity="0.25" />
      {/* Fence posts */}
      <line x1="3" y1="22" x2="3" y2="26" stroke="currentColor" strokeWidth="0.6" opacity="0.15" />
      <line x1="5.5" y1="22" x2="5.5" y2="26" stroke="currentColor" strokeWidth="0.6" opacity="0.15" />
      <line x1="8" y1="22" x2="8" y2="26" stroke="currentColor" strokeWidth="0.6" opacity="0.15" />
      {/* Fence wire */}
      <line x1="3" y1="23" x2="8" y2="23" stroke="currentColor" strokeWidth="0.4" opacity="0.12" />
      {/* Antenna on roof */}
      <line x1="16" y1="7" x2="16" y2="4" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <circle cx="16" cy="3.5" r="0.8" fill="currentColor" opacity="0.3" />
    </svg>
  );
}