import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, Signal, Wifi, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const bootLines = [
  "DEAD SIGNAL FIELD TERMINAL v2.1",
  "Initializing encrypted channel...",
  "Scanning frequency bands...",
  "Signal lock acquired.",
  "Awaiting operative credentials.",
];

export default function LoginSplash() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (visibleLines < bootLines.length) {
      const timer = setTimeout(() => setVisibleLines((v) => v + 1), 400);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(timer);
    }
  }, [visibleLines]);

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Scanline effect */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-[0.03]"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)" }}
      />

      <div className="w-full max-w-sm space-y-8 z-20">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center pulse-glow">
              <Radio className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Signal className="h-4 w-4 text-primary animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display tracking-[0.3em] text-primary uppercase">
              Dead Signal
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.4em] font-mono mt-1">
              FIELD TERMINAL — SECURE ACCESS
            </p>
          </div>
        </div>

        {/* Boot sequence */}
        <div className="border border-border bg-card/80 rounded-sm p-4 font-mono text-[11px] space-y-1 min-h-[140px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] text-primary tracking-widest uppercase">System Boot</span>
          </div>
          {bootLines.slice(0, visibleLines).map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary/50 select-none">&gt;</span>
              <span className={i === visibleLines - 1 ? "text-primary" : "text-muted-foreground"}>
                {line}
              </span>
            </div>
          ))}
          {visibleLines < bootLines.length && (
            <span className="text-primary animate-pulse">█</span>
          )}
        </div>

        {/* Login button */}
        <div className={`transition-all duration-500 ${ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <Button
            onClick={handleLogin}
            className="w-full h-12 font-mono text-sm uppercase tracking-[0.2em] gap-3 bg-primary hover:bg-primary/90"
          >
            <Lock className="h-4 w-4" />
            Authenticate
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-[9px] text-muted-foreground mt-3 tracking-wider">
            ENCRYPTED CHANNEL • AUTHORIZED PERSONNEL ONLY
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 text-[9px] text-muted-foreground/50">
          <Wifi className="h-3 w-3" />
          <span className="tracking-widest">SIGNAL STRENGTH: NOMINAL</span>
        </div>
      </div>
    </div>
  );
}