import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navDescriptions = {
  "/": "Overview of all active operations, intel, and world status",
  "/jobs": "Browse and accept available field missions",
  "/map": "Tactical grid with markers, territory control, and intel pins",
  "/events": "Live communications feed and world event broadcasts",
  "/factions": "Clan rosters, standings, and diplomatic relations",
  "/intel": "Classified intelligence reports and field analysis",
  "/market": "Track commodity prices, trade trends, and market forces",
  "/colony": "Manage your settlement, survivors, and base operations",
  "/treaties": "Diplomacy hub — propose, negotiate, and sign faction treaties",
  "/inventory": "Gear locker — manage items, trade, and P2P deals",
  "/records": "Global leaderboards and player performance rankings",
  "/dossier": "Weekly faction intelligence briefings and PDF reports",
  "/mission-log": "Persistent history of server events and operator actions",
  "/workbench": "Crafting projects, material tracking, and production",
  "/logistics": "Supply chain health, resource production, and embargoes",
  "/profile": "Your operative dossier, reputation, and mission history",
  "/admin": "Game Master command console — full world control",
};

export default function NavTooltip({ path, collapsed, children }) {
  if (!collapsed) return children;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-mono text-[11px] bg-card border-primary/30 max-w-[180px]">
          <p className="font-semibold text-primary text-[10px] tracking-wider mb-0.5">
            {path === "/" ? "SITREP" : path.replace("/", "").toUpperCase()}
          </p>
          <p className="text-muted-foreground">{navDescriptions[path] || ""}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}