/**
 * IntelEyeSvg — Surveillance/intel eye icon for intel and recon sections.
 */
export default function IntelEyeSvg({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Eye outline */}
      <path
        d="M2 14C2 14 7 6 14 6C21 6 26 14 26 14C26 14 21 22 14 22C7 22 2 14 2 14Z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.4"
        fill="currentColor"
        fillOpacity="0.03"
      />
      {/* Iris */}
      <circle cx="14" cy="14" r="5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* Pupil */}
      <circle cx="14" cy="14" r="2.5" fill="currentColor" opacity="0.5" />
      {/* Highlight */}
      <circle cx="15.5" cy="12.5" r="1" fill="currentColor" opacity="0.2" />
      {/* Scan lines through eye */}
      <line x1="4" y1="11" x2="24" y2="11" stroke="currentColor" strokeWidth="0.3" opacity="0.1" />
      <line x1="4" y1="17" x2="24" y2="17" stroke="currentColor" strokeWidth="0.3" opacity="0.1" />
      {/* Corner brackets for "surveillance" feel */}
      <path d="M2 10V8H4" stroke="currentColor" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <path d="M26 10V8H24" stroke="currentColor" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <path d="M2 18V20H4" stroke="currentColor" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
      <path d="M26 18V20H24" stroke="currentColor" strokeWidth="0.6" opacity="0.15" strokeLinecap="round" />
    </svg>
  );
}