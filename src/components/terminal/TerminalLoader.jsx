import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import ScanPulseSvg from "../svg/ScanPulseSvg";

const DEFAULT_MESSAGES = [
  "SCANNING DATABASE...",
  "DECRYPTING FEEDS...",
  "QUERYING ARCHIVES...",
  "AUTHENTICATING REQUEST...",
  "COMPILING INTEL...",
  "SYNCING RECORDS...",
];

/**
 * TerminalLoader — immersive EVE-style loading state with rotating flavor text.
 *
 * @param {string[]} messages - custom rotation messages (defaults to generic scan phrases)
 * @param {string} className - extra classes on the container
 * @param {"sm"|"md"|"lg"} size - controls icon size and padding
 */
export default function TerminalLoader({ messages = DEFAULT_MESSAGES, className, size = "md" }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, [messages.length]);

  const iconSize = size === "sm" ? 28 : size === "lg" ? 52 : 40;
  const py = size === "sm" ? "py-6" : size === "lg" ? "py-14" : "py-10";

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", py, className)}>
      <ScanPulseSvg size={iconSize} className="text-primary/50" />

      <div className="text-center space-y-1">
        <p className="text-[10px] font-mono tracking-[0.3em] text-primary/60 uppercase transition-opacity duration-500">
          {messages[idx]}
        </p>
        <p className="text-[9px] font-mono tracking-widest text-muted-foreground/30 uppercase">
          DEAD SIGNAL · FIELD TERMINAL
        </p>
      </div>

      {/* Segmented progress indicator */}
      <div className="flex items-center gap-1">
        {messages.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-px transition-all duration-500",
              i === idx
                ? "w-5 bg-primary/70"
                : i < idx
                ? "w-2.5 bg-primary/25"
                : "w-2.5 bg-border/60"
            )}
          />
        ))}
      </div>
    </div>
  );
}
