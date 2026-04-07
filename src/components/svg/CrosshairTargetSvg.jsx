/**
 * CrosshairTargetSvg — Mission/targeting crosshair for mission cards and job boards.
 */
export default function CrosshairTargetSvg({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.7" />
      {/* Crosshair lines — gaps for inner ring */}
      <line x1="12" y1="1" x2="12" y2="6" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="12" y1="18" x2="12" y2="23" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="1" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="18" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      {/* Corner brackets */}
      <path d="M4 4L4 6.5M4 4L6.5 4" stroke="currentColor" strokeWidth="0.7" opacity="0.2" strokeLinecap="round" />
      <path d="M20 4L20 6.5M20 4L17.5 4" stroke="currentColor" strokeWidth="0.7" opacity="0.2" strokeLinecap="round" />
      <path d="M4 20L4 17.5M4 20L6.5 20" stroke="currentColor" strokeWidth="0.7" opacity="0.2" strokeLinecap="round" />
      <path d="M20 20L20 17.5M20 20L17.5 20" stroke="currentColor" strokeWidth="0.7" opacity="0.2" strokeLinecap="round" />
    </svg>
  );
}