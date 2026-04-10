const WEATHER_RENDERERS = {
  clear: renderSun,
  overcast: renderCloud,
  fog: renderFog,
  rain: renderRain,
  heavy_rain: renderHeavyRain,
  thunderstorm: renderThunderstorm,
  snow: renderSnow,
  blizzard: renderBlizzard,
  dust_storm: renderDustStorm,
  ashfall: renderAshfall,
  acid_rain: renderAcidRain,
  radiation_storm: renderRadiationStorm,
};

/**
 * WeatherStatusSvg — World weather glyphs for authoritative weather surfaces.
 */
export default function WeatherStatusSvg({ size = 20, className = "", variant = "overcast" }) {
  const render = WEATHER_RENDERERS[variant] || renderCloud;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {render()}
    </svg>
  );
}

function renderSun() {
  return (
    <>
      <circle cx="14" cy="14" r="4.4" fill="currentColor" opacity="0.18" />
      <circle cx="14" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.5" opacity="0.85" />
      <path d="M14 4V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M14 21V24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M4 14H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M21 14H24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M7.2 7.2L9.5 9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M18.5 18.5L20.8 20.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M18.5 9.5L20.8 7.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M7.2 20.8L9.5 18.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
    </>
  );
}

function renderCloud() {
  return (
    <>
      <path d="M8.5 19.5H19.7C22.1 19.5 24 17.8 24 15.6C24 13.7 22.6 12.1 20.7 11.7C20.1 8.9 17.8 7 14.9 7C12.5 7 10.4 8.4 9.4 10.5C6.9 10.7 5 12.6 5 15C5 17.5 6.8 19.5 8.5 19.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" />
      <path d="M8.5 19.5H19.7C22.1 19.5 24 17.8 24 15.6C24 13.7 22.6 12.1 20.7 11.7C20.1 8.9 17.8 7 14.9 7C12.5 7 10.4 8.4 9.4 10.5C6.9 10.7 5 12.6 5 15C5 17.5 6.8 19.5 8.5 19.5Z" fill="currentColor" opacity="0.12" />
    </>
  );
}

function renderFog() {
  return (
    <>
      {renderCloud()}
      <path d="M7 21H21" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M9 23H19" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.36" />
    </>
  );
}

function renderRain() {
  return (
    <>
      {renderCloud()}
      <path d="M10.5 20.8L9.3 23.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
      <path d="M14 20.8L12.8 23.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
      <path d="M17.5 20.8L16.3 23.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

function renderHeavyRain() {
  return (
    <>
      {renderRain()}
      <path d="M7.5 20.5L6.3 23.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M20.5 20.5L19.3 23.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
    </>
  );
}

function renderThunderstorm() {
  return (
    <>
      {renderCloud()}
      <path d="M14.7 18.8L12.3 22.1H14.6L13.4 25L17.3 20.8H15.1L16.2 18.8H14.7Z" fill="currentColor" opacity="0.84" />
    </>
  );
}

function renderSnow() {
  return (
    <>
      {renderCloud()}
      <circle cx="10" cy="22.2" r="1" fill="currentColor" opacity="0.8" />
      <circle cx="14" cy="23.4" r="1" fill="currentColor" opacity="0.8" />
      <circle cx="18" cy="22.2" r="1" fill="currentColor" opacity="0.8" />
    </>
  );
}

function renderBlizzard() {
  return (
    <>
      {renderSnow()}
      <path d="M7 22.5C9 21.2 11.8 20.9 14 21.5C16 22 18.3 21.8 21 20.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
    </>
  );
}

function renderDustStorm() {
  return (
    <>
      <path d="M6 12.5C7.3 10 9.8 8.4 13 8.4C17.5 8.4 20.7 11 22.5 13.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M5.5 16.8H22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <path d="M7.5 20H19.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
      <circle cx="9" cy="14.2" r="1.1" fill="currentColor" opacity="0.3" />
      <circle cx="17.8" cy="18.4" r="0.9" fill="currentColor" opacity="0.25" />
    </>
  );
}

function renderAshfall() {
  return (
    <>
      {renderCloud()}
      <circle cx="10" cy="22.1" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="14.5" cy="23.4" r="1" fill="currentColor" opacity="0.45" />
      <circle cx="18" cy="21.8" r="1" fill="currentColor" opacity="0.7" />
    </>
  );
}

function renderAcidRain() {
  return (
    <>
      {renderCloud()}
      <path d="M10.5 20.6L9.4 23.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.88" />
      <path d="M14 20.6L12.9 23.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.88" />
      <path d="M17.5 20.6L16.4 23.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.88" />
      <circle cx="14" cy="24.2" r="1.1" fill="currentColor" opacity="0.24" />
    </>
  );
}

function renderRadiationStorm() {
  return (
    <>
      <circle cx="14" cy="14" r="3.2" fill="currentColor" opacity="0.2" />
      <circle cx="14" cy="14" r="1.5" fill="currentColor" opacity="0.85" />
      <path d="M14 7.2L17 11.4L20.8 10.6L19.3 14L21.8 17.2L17.8 17L16.2 20.8L14 17.7L11.8 20.8L10.2 17L6.2 17.2L8.7 14L7.2 10.6L11 11.4L14 7.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.82" />
    </>
  );
}
