/**
 * DiplomacyHandsSvg — Handshake/diplomacy icon for treaties and faction relations.
 */
export default function DiplomacyHandsSvg({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left hand/arm */}
      <path d="M3 18L8 13L12 14L16 16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Right hand/arm */}
      <path d="M29 18L24 13L20 14L16 16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Clasped hands center */}
      <path d="M12 14L14 12L18 12L20 14" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinejoin="round" />
      <path d="M12 14L13 16.5L16 17.5L19 16.5L20 14" stroke="currentColor" strokeWidth="0.8" opacity="0.3" fill="currentColor" fillOpacity="0.05" />
      {/* Wrist cuffs */}
      <rect x="2" y="17" width="5" height="3" rx="0.5" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
      <rect x="25" y="17" width="5" height="3" rx="0.5" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
      {/* Trust/bond arc */}
      <path d="M10 8C12 5 20 5 22 8" stroke="currentColor" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <path d="M12 6C13.5 4.5 18.5 4.5 20 6" stroke="currentColor" strokeWidth="0.5" opacity="0.1" strokeLinecap="round" />
      {/* Base line */}
      <line x1="6" y1="24" x2="26" y2="24" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
    </svg>
  );
}