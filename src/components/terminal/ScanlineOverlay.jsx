import React from 'react';
import { cn } from "@/lib/utils";

export default function ScanlineOverlay({ className }) {
  return (
    <div
      className={cn("pointer-events-none fixed inset-0 z-50", className)}
      style={{
        backgroundImage: `repeating-linear-gradient(
          transparent 0px,
          transparent 2px,
          hsl(32 82% 48% / 0.02) 2px,
          hsl(32 82% 48% / 0.02) 3px
        )`,
      }}
    />
  );
}