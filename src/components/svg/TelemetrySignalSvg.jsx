const VARIANT_STYLE = {
  live: { opacity: "0.9", slash: false },
  syncing: { opacity: "0.9", slash: false },
  stale: { opacity: "0.6", slash: false },
  offline: { opacity: "0.28", slash: true },
  error: { opacity: "0.75", slash: true },
};

/**
 * TelemetrySignalSvg — Status glyph for live, stale, and offline telemetry.
 */
export default function TelemetrySignalSvg({ size = 18, className = "", variant = "live", animated = false }) {
  const style = VARIANT_STYLE[variant] || VARIANT_STYLE.live;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M5 17C6.7 15 8.8 14 12 14C15.2 14 17.3 15 19 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={style.opacity} />
      <path d="M7.4 13.2C8.7 11.8 10.1 11.1 12 11.1C13.9 11.1 15.3 11.8 16.6 13.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={style.opacity} />
      <path d="M9.9 9.5C10.5 8.9 11.1 8.6 12 8.6C12.9 8.6 13.5 8.9 14.1 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={style.opacity} />
      <circle cx="12" cy="18.7" r="1.6" fill="currentColor" opacity={style.opacity}>
        {animated && variant === "syncing" && (
          <animate attributeName="opacity" values="0.35;1;0.35" dur="0.9s" repeatCount="indefinite" />
        )}
      </circle>
      {style.slash && (
        <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity={variant === "error" ? "0.8" : "0.45"} />
      )}
    </svg>
  );
}
