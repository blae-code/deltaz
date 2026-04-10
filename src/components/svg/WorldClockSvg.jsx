/**
 * WorldClockSvg — Server-anchored world clock glyph.
 */
export default function WorldClockSvg({ size = 20, className = "", animated = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
      <circle cx="16" cy="16" r="9.5" stroke="currentColor" strokeWidth="0.8" opacity="0.16" />
      <path d="M16 8V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <path d="M16 21V24" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
      <path d="M8 16H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
      <path d="M21 16H24" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <path d="M16 16L16 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 16L20.3 18.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
      <circle cx="16" cy="16" r="1.7" fill="currentColor" opacity="0.85" />
      <circle cx="25.5" cy="7.5" r="1.5" fill="currentColor" opacity={animated ? undefined : "0.5"}>
        {animated && (
          <animate attributeName="opacity" values="0.2;0.85;0.2" dur="1s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  );
}
