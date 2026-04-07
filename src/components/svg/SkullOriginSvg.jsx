/**
 * SkullOriginSvg — Stylized skull for origin story / character identity.
 * Simpler and more compact than SkullHazardSvg.
 */
export default function SkullOriginSvg({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Skull */}
      <path
        d="M12 3C8 3 5 6 5 10C5 12.5 6 14 7.5 15V18H10V16H14V18H16.5V15C18 14 19 12.5 19 10C19 6 16 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.6"
        fill="currentColor"
        fillOpacity="0.05"
      />
      {/* Eyes */}
      <circle cx="9.5" cy="10" r="1.8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="14.5" cy="10" r="1.8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* Nose */}
      <path d="M11.5 13L12 14L12.5 13" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      {/* Jaw line */}
      <line x1="9" y1="16" x2="15" y2="16" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      {/* Teeth marks */}
      <line x1="10.5" y1="15.5" x2="10.5" y2="16.5" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="12" y1="15.5" x2="12" y2="16.5" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="13.5" y1="15.5" x2="13.5" y2="16.5" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
}