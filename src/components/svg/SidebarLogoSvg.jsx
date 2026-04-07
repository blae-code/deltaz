/**
 * SidebarLogoSvg — Compact radio tower for the sidebar header.
 * Minimal and crisp at small sizes.
 */
export default function SidebarLogoSvg({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tower shaft */}
      <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      {/* Tower legs */}
      <line x1="12" y1="14" x2="8" y2="20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="12" y1="14" x2="16" y2="20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      {/* Cross strut */}
      <line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      {/* Antenna dot */}
      <circle cx="12" cy="4" r="1.5" fill="currentColor" opacity="0.9" />
      {/* Signal wave left */}
      <path d="M8 6C7 5 6 3.5 6 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      {/* Signal wave right */}
      <path d="M16 6C17 5 18 3.5 18 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}