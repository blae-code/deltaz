/**
 * ArtemisBotSvg — AI advisor/bot icon for the tactical advisor panel.
 */
export default function ArtemisBotSvg({ size = 24, className = "", animated = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Head shell */}
      <rect x="7" y="8" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.2" opacity="0.5" fill="currentColor" fillOpacity="0.04" />
      {/* Visor band */}
      <rect x="9" y="12" width="14" height="5" rx="1" stroke="currentColor" strokeWidth="0.8" opacity="0.3" fill="currentColor" fillOpacity="0.06" />
      {/* Eyes */}
      <circle cx="13" cy="14.5" r="1.5" fill="currentColor" opacity={animated ? undefined : "0.6"}>
        {animated && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />}
      </circle>
      <circle cx="19" cy="14.5" r="1.5" fill="currentColor" opacity={animated ? undefined : "0.6"}>
        {animated && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" begin="0.3s" />}
      </circle>
      {/* Antenna */}
      <line x1="16" y1="8" x2="16" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="16" cy="3" r="1.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3" fill="currentColor" fillOpacity={animated ? undefined : "0.15"}>
        {animated && <animate attributeName="fill-opacity" values="0.1;0.4;0.1" dur="1.5s" repeatCount="indefinite" />}
      </circle>
      {/* Mouth grill */}
      <line x1="12" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      <line x1="13" y1="21.5" x2="19" y2="21.5" stroke="currentColor" strokeWidth="0.6" opacity="0.15" />
      {/* Ear modules */}
      <rect x="4" y="13" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
      <rect x="25" y="13" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
      {/* Chin detail */}
      <line x1="14" y1="24" x2="18" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.15" />
    </svg>
  );
}