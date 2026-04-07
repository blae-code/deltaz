/**
 * ShieldLockSvg — Access denied / not registered shield icon.
 */
export default function ShieldLockSvg({ size = 64, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield body */}
      <path
        d="M32 6L10 16V30C10 44 20 54 32 58C44 54 54 44 54 30V16L32 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        d="M32 10L14 18V30C14 42 22 50 32 54C42 50 50 42 50 30V18L32 10Z"
        fill="currentColor"
        opacity="0.06"
      />
      {/* Lock body */}
      <rect x="24" y="30" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <rect x="24" y="30" width="16" height="12" rx="1.5" fill="currentColor" opacity="0.08" />
      {/* Lock shackle */}
      <path
        d="M27 30V26C27 22.5 29 20 32 20C35 20 37 22.5 37 26V30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Keyhole */}
      <circle cx="32" cy="35" r="2" fill="currentColor" opacity="0.5" />
      <line x1="32" y1="37" x2="32" y2="40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Warning stripes */}
      <line x1="16" y1="22" x2="20" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.15" />
      <line x1="48" y1="22" x2="44" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.15" />
    </svg>
  );
}