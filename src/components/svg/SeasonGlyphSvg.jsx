const SEASON_RENDERERS = {
  spring: renderSpring,
  summer: renderSummer,
  autumn: renderAutumn,
  winter: renderWinter,
  nuclear_winter: renderNuclearWinter,
  dry_season: renderDrySeason,
  monsoon: renderMonsoon,
};

/**
 * SeasonGlyphSvg — Compact seasonal sigils for world-state displays.
 */
export default function SeasonGlyphSvg({ size = 18, className = "", variant = "autumn" }) {
  const render = SEASON_RENDERERS[variant] || renderAutumn;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {render()}
    </svg>
  );
}

function renderSpring() {
  return (
    <>
      <path d="M12 19.2V9.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
      <path d="M12 12.4C9.8 12.4 8 10.8 8 8.8C10.3 8.8 12 10.3 12 12.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.75" />
      <path d="M12 15.4C14.2 15.4 16 13.8 16 11.8C13.7 11.8 12 13.3 12 15.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.75" />
      <circle cx="12" cy="7" r="1.2" fill="currentColor" opacity="0.8" />
    </>
  );
}

function renderSummer() {
  return (
    <>
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.4" opacity="0.85" />
      <path d="M12 3.5V6.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M12 17.7V20.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M3.5 12H6.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M17.7 12H20.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M6.2 6.2L8.2 8.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M15.8 15.8L17.8 17.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M15.8 8.2L17.8 6.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M6.2 17.8L8.2 15.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
    </>
  );
}

function renderAutumn() {
  return (
    <>
      <path d="M12.8 5.8C15.9 7.5 17.2 10.5 16.3 13.2C15.2 16.6 11.7 18 8.6 17C7.8 13.6 8.8 10.5 11.2 8.1L12.8 5.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.82" />
      <path d="M10 17.4L13.8 8.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </>
  );
}

function renderWinter() {
  return (
    <>
      <path d="M12 4.2V19.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M4.2 12H19.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M6.2 6.2L17.8 17.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.62" />
      <path d="M17.8 6.2L6.2 17.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.62" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.85" />
    </>
  );
}

function renderNuclearWinter() {
  return (
    <>
      {renderWinter()}
      <circle cx="18" cy="6" r="1.5" fill="currentColor" opacity="0.9" />
      <circle cx="18" cy="6" r="3.2" stroke="currentColor" strokeWidth="0.8" opacity="0.26" />
    </>
  );
}

function renderDrySeason() {
  return (
    <>
      <path d="M6 16.5C8 13.2 10.6 11.5 14 11.5C15.8 11.5 17.4 12 18.8 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <path d="M4.5 19.2H19.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <path d="M8 7.5C10.2 5.6 12.6 5.4 15 7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <circle cx="18.5" cy="7" r="1.6" fill="currentColor" opacity="0.8" />
    </>
  );
}

function renderMonsoon() {
  return (
    <>
      <path d="M7.5 14.4H18.2C20.3 14.4 22 12.8 22 10.9C22 9.3 20.8 8 19.1 7.7C18.5 5.4 16.5 3.9 14.1 3.9C12 3.9 10.2 5.1 9.4 6.9C7.2 7.1 5.6 8.8 5.6 10.8C5.6 12.9 7.1 14.4 7.5 14.4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.78" />
      <path d="M9.2 16.4L8 20.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
      <path d="M13.2 16.4L12 20.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
      <path d="M17.2 16.4L16 20.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
    </>
  );
}
