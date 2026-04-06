// Static terrain configuration for the 5×5 tactical grid (sectors A-1 through E-5).
// TERRAIN_CONFIG maps each sector ID to a terrain type.
// TERRAIN_STYLES maps each terrain type to background color + SVG tile pattern.

export const TERRAIN_CONFIG = {
  "A-1": "forest",     "A-2": "urban",       "A-3": "industrial", "A-4": "wasteland",  "A-5": "ruins",
  "B-1": "urban",      "B-2": "industrial",  "B-3": "urban",      "B-4": "flooded",    "B-5": "forest",
  "C-1": "wasteland",  "C-2": "urban",       "C-3": "crater",     "C-4": "industrial", "C-5": "marshland",
  "D-1": "forest",     "D-2": "flooded",     "D-3": "urban",      "D-4": "ruins",      "D-5": "wasteland",
  "E-1": "ruins",      "E-2": "wasteland",   "E-3": "marshland",  "E-4": "forest",     "E-5": "crater",
};

// SVG patterns are URL-encoded data URIs — no external files needed.
export const TERRAIN_STYLES = {
  urban: {
    bg: "rgba(90,90,110,0.18)",
    pattern: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect x='0' y='0' width='4' height='4' fill='rgba(100,100,130,0.15)'/%3E%3Crect x='4' y='4' width='4' height='4' fill='rgba(100,100,130,0.15)'/%3E%3C/svg%3E\")",
    label: "URBAN",
  },
  industrial: {
    bg: "rgba(120,80,40,0.15)",
    pattern: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cline x1='0' y1='6' x2='6' y2='0' stroke='rgba(180,100,40,0.2)' stroke-width='1'/%3E%3C/svg%3E\")",
    label: "INDUSTRIAL",
  },
  wasteland: {
    bg: "rgba(160,130,60,0.12)",
    pattern: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='2' cy='2' r='0.7' fill='rgba(180,140,60,0.25)'/%3E%3C/svg%3E\")",
    label: "WASTELAND",
  },
  flooded: {
    bg: "rgba(30,80,160,0.18)",
    pattern: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='4'%3E%3Cpath d='M0 2 Q2.5 0 5 2 Q7.5 4 10 2' stroke='rgba(80,140,255,0.2)' fill='none' stroke-width='0.8'/%3E%3C/svg%3E\")",
    label: "FLOODED",
  },
  forest: {
    bg: "rgba(30,100,50,0.15)",
    pattern: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='rgba(40,120,60,0.2)'/%3E%3Ccircle cx='6' cy='6' r='1.5' fill='rgba(40,120,60,0.2)'/%3E%3C/svg%3E\")",
    label: "FOREST",
  },
  ruins: {
    bg: "rgba(70,60,50,0.18)",
    pattern: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Crect x='1' y='1' width='2' height='2' fill='none' stroke='rgba(120,100,70,0.25)' stroke-width='0.5'/%3E%3Crect x='4' y='4' width='1.5' height='1.5' fill='none' stroke='rgba(120,100,70,0.25)' stroke-width='0.5'/%3E%3C/svg%3E\")",
    label: "RUINS",
  },
  crater: {
    bg: "rgba(50,40,40,0.20)",
    pattern: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Ccircle cx='6' cy='6' r='4' fill='none' stroke='rgba(100,70,50,0.25)' stroke-width='0.8'/%3E%3Ccircle cx='6' cy='6' r='2' fill='rgba(80,60,50,0.15)'/%3E%3C/svg%3E\")",
    label: "CRATER",
  },
  marshland: {
    bg: "rgba(40,90,70,0.15)",
    pattern: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cline x1='0' y1='4' x2='8' y2='4' stroke='rgba(40,130,100,0.15)' stroke-width='1'/%3E%3Ccircle cx='4' cy='2' r='0.8' fill='rgba(40,130,100,0.2)'/%3E%3C/svg%3E\")",
    label: "MARSHLAND",
  },
};
