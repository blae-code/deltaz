/**
 * BroadcastBeaconSvg — Transmission beacon for comms and broadcast surfaces.
 */
export default function BroadcastBeaconSvg({ size = 18, className = "", animated = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M12 22H16L15 17H13L12 22Z" fill="currentColor" opacity="0.2" />
      <path d="M14 6L11.5 17H16.5L14 6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity="0.75" />
      <circle cx="14" cy="6" r="1.8" fill="currentColor" opacity="0.88" />
      <path d="M8.5 9.5C7 8.2 6 6.7 5.4 4.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity={animated ? undefined : "0.3"}>
        {animated && (
          <animate attributeName="opacity" values="0.08;0.55;0.08" dur="1.3s" repeatCount="indefinite" />
        )}
      </path>
      <path d="M19.5 9.5C21 8.2 22 6.7 22.6 4.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity={animated ? undefined : "0.3"}>
        {animated && (
          <animate attributeName="opacity" values="0.08;0.55;0.08" dur="1.3s" repeatCount="indefinite" begin="0.25s" />
        )}
      </path>
      <path d="M5.8 13C3.7 11.1 2.4 8.7 1.8 5.7" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.16" />
      <path d="M22.2 13C24.3 11.1 25.6 8.7 26.2 5.7" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.16" />
      <line x1="10.5" y1="22.4" x2="17.5" y2="22.4" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}
