import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, Signal, Lock, ChevronRight, Wifi, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import BootSequence from "./BootSequence";
import WorldStatus from "./WorldStatus";

export default function LoginSplash() {
  const [bootDone, setBootDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(new Date());
  const particlesRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bootDone) {
      const timer = setTimeout(() => setReady(true), 500);
      return () => clearTimeout(timer);
    }
  }, [bootDone]);

  // Particle background
  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45, 212, 160, ${p.alpha})`;
        ctx.fill();
      });
      // Draw faint connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(45, 212, 160, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const formatTime = (d) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const formatDate = (d) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Particle canvas */}
      <canvas ref={particlesRef} className="absolute inset-0 z-0" />

      {/* Scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10 opacity-[0.025]"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px)",
        }}
      />

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Top bar — clock & signal */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3 border-b border-border/30">
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60 font-mono tracking-wider">
          <Wifi className="h-3 w-3 text-primary/40" />
          <span>SIGNAL: NOMINAL</span>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground/60 font-mono tracking-wider">
          <span>{formatDate(time)}</span>
          <span className="text-primary/60">{formatTime(time)}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-20 w-full max-w-md px-6 space-y-6">
        {/* Logo block */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto w-24 h-24">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-1 rounded-full border border-primary/10 animate-[spin_15s_linear_infinite_reverse]" />
            {/* Inner icon */}
            <div className="absolute inset-3 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center pulse-glow">
              <Radio className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute top-1 right-1">
              <Signal className="h-4 w-4 text-primary animate-pulse" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-[0.3em] text-primary uppercase">
              Dead Signal
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30" />
              <p className="text-[9px] text-muted-foreground tracking-[0.5em] font-mono uppercase">
                Field Terminal
              </p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30" />
            </div>
          </div>

          {/* Tagline */}
          <p className="text-[11px] text-muted-foreground/70 font-mono italic max-w-xs mx-auto leading-relaxed">
            "When the towers fell and the frequencies went silent, we built our own signal.
            Now we listen. Now we survive."
          </p>
        </div>

        {/* Boot terminal */}
        <div className="border border-border/60 bg-card/60 backdrop-blur-sm rounded-sm overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-secondary/30">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <div className="h-1.5 w-1.5 rounded-full bg-accent/60" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            <span className="text-[8px] text-muted-foreground/60 tracking-widest ml-2 font-mono">
              /sys/boot
            </span>
          </div>
          <div className="p-3 min-h-[200px]">
            <BootSequence onComplete={() => setBootDone(true)} />
          </div>
        </div>

        {/* World status — appears after boot */}
        <WorldStatus visible={bootDone} />

        {/* Login button — fades in after boot */}
        <div className={`transition-all duration-700 ${ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}>
          <Button
            onClick={handleLogin}
            className="w-full h-12 font-mono text-sm uppercase tracking-[0.2em] gap-3 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Lock className="h-4 w-4" />
            Authenticate
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <div className="h-1 w-1 rounded-full bg-primary/40 animate-pulse" />
            <p className="text-[8px] text-muted-foreground/50 tracking-[0.3em] font-mono">
              ENCRYPTED CHANNEL — AUTHORIZED PERSONNEL ONLY
            </p>
            <div className="h-1 w-1 rounded-full bg-primary/40 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Bottom decorative bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-border/20 px-4 sm:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[8px] text-muted-foreground/40 font-mono tracking-widest">
          <span>BUILD 2.1.7b</span>
          <span>NODE: ALPHA-7</span>
        </div>
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground/40 font-mono tracking-widest">
          <div className="h-1.5 w-1.5 rounded-full bg-status-ok/50" />
          <span>ALL SYSTEMS NOMINAL</span>
        </div>
      </div>
    </div>
  );
}