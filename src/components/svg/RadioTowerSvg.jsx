/**
 * RadioTowerSvg — Custom SVG radio tower with signal waves.
 * Used in sidebar logo, login splash, auth loading.
 */
export default function RadioTowerSvg({ size = 40, animated = false, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tower base */}
      <path
        d="M28 58H36L34 38H30L28 58Z"
        fill="currentColor"
        opacity="0.3"
      />
      {/* Tower left leg */}
      <path
        d="M22 58L28 28H30L26 58H22Z"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
      />
      {/* Tower right leg */}
      <path
        d="M42 58L36 28H34L38 58H42Z"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
      />
      {/* Tower shaft */}
      <line x1="32" y1="8" x2="32" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.8" />
      {/* Cross struts */}
      <line x1="27" y1="34" x2="37" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="28" y1="40" x2="36" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="25" y1="46" x2="39" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Antenna top */}
      <circle cx="32" cy="8" r="2.5" fill="currentColor" opacity="0.9" />
      <circle cx="32" cy="8" r="4" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      {/* Signal waves — left */}
      <path
        d="M22 12C22 12 18 8 18 4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={animated ? undefined : "0.4"}
      >
        {animated && (
          <animate attributeName="opacity" values="0.1;0.6;0.1" dur="2s" repeatCount="indefinite" />
        )}
      </path>
      <path
        d="M19 16C19 16 13 10 13 3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity={animated ? undefined : "0.25"}
      >
        {animated && (
          <animate attributeName="opacity" values="0.05;0.4;0.05" dur="2s" repeatCount="indefinite" begin="0.3s" />
        )}
      </path>
      {/* Signal waves — right */}
      <path
        d="M42 12C42 12 46 8 46 4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={animated ? undefined : "0.4"}
      >
        {animated && (
          <animate attributeName="opacity" values="0.1;0.6;0.1" dur="2s" repeatCount="indefinite" />
        )}
      </path>
      <path
        d="M45 16C45 16 51 10 51 3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity={animated ? undefined : "0.25"}
      >
        {animated && (
          <animate attributeName="opacity" values="0.05;0.4;0.05" dur="2s" repeatCount="indefinite" begin="0.3s" />
        )}
      </path>
      {/* Ground line */}
      <line x1="18" y1="58" x2="46" y2="58" stroke="currentColor" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}