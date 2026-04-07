/**
 * SkullHazardSvg — Wasteland danger/hazard icon.
 * Used for threat indicators, warnings, dangerous zones.
 */
export default function SkullHazardSvg({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Skull outline */}
      <path
        d="M24 6C16 6 10 12 10 20C10 25 12 28 15 30V36H21V33H27V36H33V30C36 28 38 25 38 20C38 12 32 6 24 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M24 6C16 6 10 12 10 20C10 25 12 28 15 30V36H21V33H27V36H33V30C36 28 38 20 38 20C38 12 32 6 24 6Z"
        fill="currentColor"
        opacity="0.05"
      />
      {/* Left eye */}
      <ellipse cx="19" cy="20" rx="3" ry="3.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <ellipse cx="19" cy="20" rx="1.2" ry="1.5" fill="currentColor" opacity="0.4" />
      {/* Right eye */}
      <ellipse cx="29" cy="20" rx="3" ry="3.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <ellipse cx="29" cy="20" rx="1.2" ry="1.5" fill="currentColor" opacity="0.4" />
      {/* Nose */}
      <path d="M23 25L24 27L25 25" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      {/* Teeth */}
      <line x1="20" y1="30" x2="20" y2="33" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="24" y1="30" x2="24" y2="33" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="28" y1="30" x2="28" y2="33" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      {/* Crossbones behind */}
      <line x1="8" y1="38" x2="40" y2="44" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.15" />
      <line x1="40" y1="38" x2="8" y2="44" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.15" />
      {/* Bone ends */}
      <circle cx="8" cy="38" r="1.5" fill="currentColor" opacity="0.1" />
      <circle cx="40" cy="38" r="1.5" fill="currentColor" opacity="0.1" />
      <circle cx="8" cy="44" r="1.5" fill="currentColor" opacity="0.1" />
      <circle cx="40" cy="44" r="1.5" fill="currentColor" opacity="0.1" />
    </svg>
  );
}