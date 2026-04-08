import { useEffect, useState } from "react";

/**
 * Full-overlay lightning flash for thunderstorm weather.
 * Randomly triggers a bright white flash with afterglow.
 */
export default function LightningFlash({ active }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!active) return;
    const trigger = () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
    };
    // Random interval between 3-8 seconds
    const schedule = () => {
      const delay = 3000 + Math.random() * 5000;
      return setTimeout(() => { trigger(); tid = schedule(); }, delay);
    };
    let tid = schedule();
    return () => clearTimeout(tid);
  }, [active]);

  if (!active || !flash) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        background: "radial-gradient(ellipse at 30% 10%, rgba(255,255,255,0.25) 0%, transparent 70%)",
        animation: "lightning-fade 150ms ease-out forwards",
      }}
    />
  );
}