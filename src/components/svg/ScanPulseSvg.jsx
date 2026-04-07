/**
 * ScanPulseSvg — Animated scanning/authenticating pulse for loading states.
 */
export default function ScanPulseSvg({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Center dot */}
      <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.8">
        <animate attributeName="r" values="3;4;3" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Ring 1 */}
      <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1" fill="none">
        <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Ring 2 */}
      <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="0.8" fill="none">
        <animate attributeName="r" values="12;17;12" dur="2s" repeatCount="indefinite" begin="0.4s" />
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2s" repeatCount="indefinite" begin="0.4s" />
      </circle>
      {/* Ring 3 */}
      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="0.5" fill="none">
        <animate attributeName="r" values="17;20;17" dur="2s" repeatCount="indefinite" begin="0.8s" />
        <animate attributeName="opacity" values="0.15;0.04;0.15" dur="2s" repeatCount="indefinite" begin="0.8s" />
      </circle>
      {/* Crosshair lines */}
      <line x1="20" y1="0" x2="20" y2="6" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      <line x1="20" y1="34" x2="20" y2="40" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      <line x1="0" y1="20" x2="6" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
      <line x1="34" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
    </svg>
  );
}