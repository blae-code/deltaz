import { useEffect, useRef } from "react";

/**
 * Canvas-based weather particle system.
 * Renders rain, snow, dust, ash, or radiation depending on weather type.
 */
const PARTICLE_CONFIGS = {
  rain:             { count: 80, color: "rgba(96,165,250,0.4)",  speed: 6, size: 1.5, angle: 0.15, trail: 8 },
  heavy_rain:       { count: 140, color: "rgba(59,130,246,0.5)", speed: 9, size: 2, angle: 0.2, trail: 12 },
  thunderstorm:     { count: 120, color: "rgba(59,130,246,0.45)", speed: 8, size: 2, angle: 0.25, trail: 10 },
  snow:             { count: 50, color: "rgba(200,220,255,0.5)", speed: 1.2, size: 2.5, angle: 0, trail: 0 },
  blizzard:         { count: 100, color: "rgba(220,230,255,0.6)", speed: 3, size: 3, angle: 0.4, trail: 0 },
  dust_storm:       { count: 70, color: "rgba(194,154,96,0.35)", speed: 4, size: 2, angle: 0.6, trail: 0 },
  ashfall:          { count: 40, color: "rgba(160,160,160,0.3)", speed: 0.8, size: 2, angle: 0.1, trail: 0 },
  acid_rain:        { count: 80, color: "rgba(74,222,128,0.4)", speed: 6, size: 1.5, angle: 0.15, trail: 8 },
  radiation_storm:  { count: 30, color: "rgba(239,68,68,0.3)", speed: 0.5, size: 4, angle: 0, trail: 0 },
  fog:              { count: 0 },
  clear:            { count: 0 },
  overcast:         { count: 0 },
};

export default function WeatherParticles({ weather, className }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cfg = PARTICLE_CONFIGS[weather] || { count: 0 };
    if (cfg.count === 0) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const particles = Array.from({ length: cfg.count }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      s: cfg.size * (0.5 + Math.random() * 0.8),
      drift: (Math.random() - 0.5) * cfg.angle,
      speed: cfg.speed * (0.6 + Math.random() * 0.6),
      opacity: 0.4 + Math.random() * 0.6,
    }));

    const isRain = ["rain", "heavy_rain", "thunderstorm", "acid_rain"].includes(weather);
    const isSnow = ["snow", "blizzard", "ashfall"].includes(weather);

    const draw = () => {
      ctx.clearRect(0, 0, w(), h());
      for (const p of particles) {
        p.y += p.speed;
        p.x += p.drift + (isSnow ? Math.sin(p.y * 0.01) * 0.3 : 0);

        if (p.y > h()) { p.y = -10; p.x = Math.random() * w(); }
        if (p.x > w()) p.x = 0;
        if (p.x < 0) p.x = w();

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = cfg.color;

        if (isRain) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.drift * cfg.trail, p.y - cfg.trail);
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth = p.s;
          ctx.stroke();
        } else if (weather === "radiation_storm") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = p.opacity * 0.3;
          ctx.arc(p.x, p.y, p.s * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [weather]);

  const cfg = PARTICLE_CONFIGS[weather] || { count: 0 };
  if (cfg.count === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className || ""}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
}