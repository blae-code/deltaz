/**
 * WastelandSvg — Empty wasteland scene for empty states.
 * Shows a desolate horizon with dead tree and distant ruins.
 */
export default function WastelandSvg({ size = 48, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Sky — distant haze */}
      <line x1="0" y1="30" x2="64" y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      {/* Horizon line */}
      <line x1="0" y1="36" x2="64" y2="36" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* Ground texture */}
      <line x1="4" y1="40" x2="12" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
      <line x1="20" y1="42" x2="30" y2="42" stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
      <line x1="40" y1="41" x2="52" y2="41" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
      <line x1="50" y1="44" x2="60" y2="44" stroke="currentColor" strokeWidth="0.5" opacity="0.06" />
      {/* Dead tree */}
      <line x1="18" y1="36" x2="18" y2="22" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      <line x1="18" y1="26" x2="14" y2="20" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
      <line x1="18" y1="24" x2="22" y2="18" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
      <line x1="18" y1="28" x2="15" y2="25" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      {/* Distant ruined building */}
      <rect x="42" y="28" width="8" height="8" stroke="currentColor" strokeWidth="0.8" opacity="0.15" />
      <line x1="42" y1="28" x2="46" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.12" />
      <line x1="46" y1="24" x2="50" y2="28" stroke="currentColor" strokeWidth="0.8" opacity="0.12" />
      {/* Broken window */}
      <rect x="44" y="31" width="2" height="3" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
      {/* Small rubble */}
      <circle cx="54" cy="35" r="1" fill="currentColor" opacity="0.1" />
      <circle cx="56" cy="36" r="0.6" fill="currentColor" opacity="0.08" />
      {/* Distant radio tower silhouette */}
      <line x1="8" y1="36" x2="8" y2="28" stroke="currentColor" strokeWidth="0.6" opacity="0.1" />
      <circle cx="8" cy="27" r="0.8" fill="currentColor" opacity="0.1" />
      {/* Dust particles */}
      <circle cx="30" cy="32" r="0.4" fill="currentColor" opacity="0.12">
        <animate attributeName="cx" values="30;34;30" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="48" cy="34" r="0.3" fill="currentColor" opacity="0.1">
        <animate attributeName="cx" values="48;52;48" dur="8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}