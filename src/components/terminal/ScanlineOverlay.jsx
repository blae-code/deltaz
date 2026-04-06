import React from 'react';
import { cn } from "@/lib/utils";

export default function ScanlineOverlay({ className }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-50 opacity-10",
        "bg-[repeating-linear-gradient(transparent_0px,transparent_1px,white_1px,white_2px)]",
        className
      )}
    />
  );
}