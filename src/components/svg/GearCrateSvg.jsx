/**
 * GearCrateSvg — Supply crate/ammo box for inventory and gear sections.
 */
export default function GearCrateSvg({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Crate body */}
      <rect x="4" y="10" width="24" height="16" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.45" fill="currentColor" fillOpacity="0.04" />
      {/* Lid */}
      <path d="M3 10H29L27 6H5L3 10Z" stroke="currentColor" strokeWidth="1" opacity="0.35" fill="currentColor" fillOpacity="0.03" />
      {/* Center latch */}
      <rect x="14" y="8" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3" fill="currentColor" fillOpacity="0.06" />
      {/* Horizontal planks */}
      <line x1="4" y1="15" x2="28" y2="15" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      <line x1="4" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      {/* Center cross mark */}
      <line x1="14" y1="15" x2="18" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.12" />
      <line x1="18" y1="15" x2="14" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.12" />
      {/* Handles */}
      <path d="M6 13C6 12 7 11 8 12" stroke="currentColor" strokeWidth="0.7" opacity="0.2" strokeLinecap="round" />
      <path d="M26 13C26 12 25 11 24 12" stroke="currentColor" strokeWidth="0.7" opacity="0.2" strokeLinecap="round" />
      {/* Bottom shadow */}
      <line x1="6" y1="27" x2="26" y2="27" stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
    </svg>
  );
}