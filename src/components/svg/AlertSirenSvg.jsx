/**
 * AlertSirenSvg — Emergency/threat siren icon for critical alerts.
 */
export default function AlertSirenSvg({ size = 24, className = "", animated = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Siren base */}
      <rect x="10" y="22" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      {/* Siren dome */}
      <path
        d="M12 22V16C12 12.7 13.8 10 16 10C18.2 10 20 12.7 20 16V22"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M12 22V16C12 12.7 13.8 10 16 10C18.2 10 20 12.7 20 16V22"
        fill="currentColor"
        opacity="0.08"
      />
      {/* Light top */}
      <circle cx="16" cy="10" r="2.5" fill="currentColor" opacity={animated ? undefined : "0.6"}>
        {animated && (
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.8s" repeatCount="indefinite" />
        )}
      </circle>
      {/* Alert waves */}
      <path d="M8 12C7 10 6 8 6 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity={animated ? undefined : "0.25"}>
        {animated && (
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur="0.8s" repeatCount="indefinite" />
        )}
      </path>
      <path d="M24 12C25 10 26 8 26 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity={animated ? undefined : "0.25"}>
        {animated && (
          <animate attributeName="opacity" values="0.1;0.5;0.1" dur="0.8s" repeatCount="indefinite" begin="0.4s" />
        )}
      </path>
      {/* Outer waves */}
      <path d="M5 14C3.5 11 2.5 8 3 4" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.12" />
      <path d="M27 14C28.5 11 29.5 8 29 4" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.12" />
      {/* Base detail */}
      <line x1="13" y1="24" x2="19" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      {/* Mount */}
      <line x1="14" y1="26" x2="18" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="16" y1="26" x2="16" y2="29" stroke="currentColor" strokeWidth="1" opacity="0.25" />
    </svg>
  );
}