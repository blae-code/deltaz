import {
  Crosshair, AlertTriangle, Shield, Map, Radio, Activity,
  Eye, TrendingUp, Home, Zap, Coins, ScrollText, Target, Swords, BookOpen, Cloud,
} from "lucide-react";

import TacticalMapWidget from "./TacticalMapWidget";
import ActivityFeed from "./ActivityFeed";
import IntelHighlights from "./IntelHighlights";
import TacticalAdvisor from "./TacticalAdvisor";
import ScavengeLog from "./ScavengeLog";
import CommsTelemetryWidget from "./CommsTelemetryWidget";
import ColonyMonitor from "./ColonyMonitor";
import FactionEconomyWidget from "./FactionEconomyWidget";
import MissionForgeFeed from "./MissionForgeFeed";
import ConflictLog from "./ConflictLog";
import JournalWidget from "./JournalWidget";
import SectorEventWidget from "./SectorEventWidget";

// Each widget definition
// sizes: "sm" = 1 col, "md" = 1 col, "lg" = 2 col, "full" = full width
const WIDGET_REGISTRY = [
  {
    id: "stats",
    label: "Operational Stats",
    icon: Activity,
    defaultSize: "full",
    sizes: ["full"],
    builtin: true, // rendered separately, not as a widget component
  },
  {
    id: "world_pulse",
    label: "World Pulse Status",
    icon: Radio,
    defaultSize: "full",
    sizes: ["full"],
    builtin: true,
  },
  {
    id: "comms_telemetry",
    label: "Comms & Telemetry",
    icon: ScrollText,
    defaultSize: "full",
    sizes: ["lg", "full"],
    component: CommsTelemetryWidget,
  },
  {
    id: "colony_monitor",
    label: "Colony Monitor",
    icon: Home,
    defaultSize: "full",
    sizes: ["md", "lg", "full"],
    component: ColonyMonitor,
  },
  {
    id: "tactical_map",
    label: "Active Threat Map",
    icon: Map,
    defaultSize: "full",
    sizes: ["lg", "full"],
    component: TacticalMapWidget,
  },
  {
    id: "activity_feed",
    label: "Activity Feed",
    icon: ScrollText,
    defaultSize: "lg",
    sizes: ["md", "lg", "full"],
    component: ActivityFeed,
  },
  {
    id: "intel_highlights",
    label: "Intel Highlights",
    icon: Eye,
    defaultSize: "md",
    sizes: ["md", "lg", "full"],
    component: IntelHighlights,
  },
  {
    id: "scavenge_log",
    label: "Scavenge Log",
    icon: Target,
    defaultSize: "full",
    sizes: ["md", "lg", "full"],
    component: ScavengeLog,
  },
  {
    id: "faction_economy",
    label: "Faction Economy Summary",
    icon: Coins,
    defaultSize: "lg",
    sizes: ["md", "lg", "full"],
    component: FactionEconomyWidget,
  },
  {
    id: "mission_forge",
    label: "Mission Forge Feed",
    icon: Zap,
    defaultSize: "md",
    sizes: ["md", "lg", "full"],
    component: MissionForgeFeed,
  },
  {
    id: "tactical_advisor",
    label: "Tactical Advisor",
    icon: Shield,
    defaultSize: "md",
    sizes: ["md", "lg", "full"],
    component: TacticalAdvisor,
  },
  {
    id: "conflict_log",
    label: "Conflict Log",
    icon: Swords,
    defaultSize: "lg",
    sizes: ["md", "lg", "full"],
    component: ConflictLog,
  },
  {
    id: "journal",
    label: "Active Journal",
    icon: BookOpen,
    defaultSize: "md",
    sizes: ["md", "lg", "full"],
    component: JournalWidget,
  },
  {
    id: "sector_events",
    label: "Sector Events",
    icon: Cloud,
    defaultSize: "md",
    sizes: ["md", "lg", "full"],
    component: SectorEventWidget,
  },
];

export default WIDGET_REGISTRY;

// Default layout for new users
export const DEFAULT_LAYOUT = WIDGET_REGISTRY.map((w) => ({
  id: w.id,
  visible: true,
  size: w.defaultSize,
}));
