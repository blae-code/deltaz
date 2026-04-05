import { useState, useEffect } from "react";

const BOOT_LINES = [
  { text: "DEAD SIGNAL FIELD TERMINAL v2.1.7b", delay: 200, type: "header" },
  { text: "BIOS CHECK ................ OK", delay: 300, type: "system" },
  { text: "RAM 4096K ................. OK", delay: 250, type: "system" },
  { text: "LOADING KERNEL MODULE: ds_crypto.sys", delay: 400, type: "system" },
  { text: "LOADING KERNEL MODULE: rf_scanner.sys", delay: 350, type: "system" },
  { text: "MOUNTING ENCRYPTED PARTITION /vault", delay: 300, type: "system" },
  { text: ">> Scanning frequency bands...", delay: 500, type: "scan" },
  { text: ">> Band 7.41 GHz — interference detected", delay: 400, type: "warn" },
  { text: ">> Band 12.88 GHz — SIGNAL LOCK ACQUIRED", delay: 600, type: "success" },
  { text: "ESTABLISHING ENCRYPTED UPLINK TO HQ...", delay: 500, type: "system" },
  { text: "HANDSHAKE COMPLETE — 256-BIT AES TUNNEL ACTIVE", delay: 400, type: "success" },
  { text: "LAST KNOWN BROADCAST: \"They are still out there.\"", delay: 600, type: "lore" },
  { text: "", delay: 200, type: "blank" },
  { text: "AWAITING OPERATIVE CREDENTIALS.", delay: 300, type: "prompt" },
];

export default function BootSequence({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let idx = 0;
    let timeout;

    const showNext = () => {
      if (idx >= BOOT_LINES.length) {
        setTimeout(() => { setDone(true); onComplete?.(); }, 400);
        return;
      }
      const line = BOOT_LINES[idx];
      setLines((prev) => [...prev, line]);
      idx++;
      timeout = setTimeout(showNext, line.delay);
    };

    timeout = setTimeout(showNext, 500);
    return () => clearTimeout(timeout);
  }, []);

  const typeColor = {
    header: "text-primary font-bold",
    system: "text-muted-foreground",
    scan: "text-chart-4",
    warn: "text-status-warn",
    success: "text-status-ok",
    lore: "text-accent italic",
    prompt: "text-primary font-semibold",
    blank: "",
  };

  return (
    <div className="font-mono text-[10px] leading-relaxed space-y-0.5 max-h-[280px] overflow-y-auto scrollbar-thin">
      {lines.map((line, i) => (
        <div key={i} className={`flex items-start gap-1.5 ${typeColor[line.type] || ""}`}>
          {line.type !== "blank" && line.type !== "lore" && (
            <span className="text-primary/30 select-none shrink-0">&gt;</span>
          )}
          {line.type === "lore" && (
            <span className="text-accent/40 select-none shrink-0">◆</span>
          )}
          <span>{line.text}</span>
        </div>
      ))}
      {!done && <span className="text-primary animate-pulse">█</span>}
    </div>
  );
}