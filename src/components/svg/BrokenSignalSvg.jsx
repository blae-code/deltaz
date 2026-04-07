/**
 * BrokenSignalSvg — Broken/glitched radio tower for 404 and error states.
 */
export default function BrokenSignalSvg({ size = 64, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Broken tower — leaning */}
      <path
        d="M26 58L30 30L32 10"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.5"
        strokeDasharray="4 2"
      />
      {/* Broken half fallen right */}
      <path
        d="M32 20L40 32L44 50"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        strokeDasharray="3 3"
      />
      {/* Broken struts */}
      <line x1="27" y1="36" x2="34" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="28" y1="44" x2="38" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      {/* Dead antenna */}
      <circle cx="32" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      {/* Static/noise lines */}
      <line x1="14" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      <line x1="42" y1="6" x2="50" y2="6" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="44" y1="10" x2="48" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      {/* X marks — no signal */}
      <line x1="18" y1="4" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      <line x1="22" y1="4" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      <line x1="44" y1="2" x2="48" y2="6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      <line x1="48" y1="2" x2="44" y2="6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      {/* Sparks */}
      <circle cx="33" cy="20" r="1" fill="currentColor" opacity="0.6">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="35" cy="25" r="0.8" fill="currentColor" opacity="0.4">
        <animate attributeName="opacity" values="0.1;0.6;0.1" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </circle>
      {/* Ground debris */}
      <line x1="20" y1="58" x2="44" y2="58" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <line x1="36" y1="56" x2="40" y2="58" stroke="currentColor" strokeWidth="0.8" opacity="0.15" />
      <line x1="22" y1="57" x2="26" y2="58" stroke="currentColor" strokeWidth="0.8" opacity="0.15" />
    </svg>
  );
}