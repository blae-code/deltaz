import SkeletonCard from "./SkeletonCard";
import TerminalLoader from "./TerminalLoader";
import { cn } from "@/lib/utils";

const VARIANT_MESSAGES = {
  mission: [
    "SCANNING MISSION ARCHIVE...",
    "RETRIEVING ACTIVE CONTRACTS...",
    "DECRYPTING JOB BOARD...",
  ],
  inventory: [
    "CATALOGUING GEAR LOCKER...",
    "READING EQUIPMENT MANIFESTS...",
    "LOADING LOADOUT DATA...",
  ],
  project: [
    "CHECKING WORKBENCH STATUS...",
    "LOADING CRAFTING QUEUE...",
    "READING PROJECT FILES...",
  ],
  default: [
    "LOADING RECORDS...",
    "SYNCING DATA...",
    "DECRYPTING FEEDS...",
  ],
};

/**
 * SkeletonGrid — animated placeholder grid for loading states.
 * Shows EVE-style rotating flavor text above the skeleton cards.
 *
 * @param {number} count - how many skeleton cards to show
 * @param {string} variant - "mission" | "inventory" | "project" | "default"
 * @param {string} cols - override grid column classes
 * @param {string[]} messages - override loading messages
 */
export default function SkeletonGrid({ count = 6, variant = "default", cols, messages }) {
  const gridClass = cols || (
    variant === "mission"   ? "grid gap-2" :
    variant === "inventory" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-2" :
    variant === "project"   ? "grid gap-2" :
    "grid md:grid-cols-2 gap-2"
  );

  const loaderMessages = messages || VARIANT_MESSAGES[variant] || VARIANT_MESSAGES.default;

  return (
    <div className="space-y-3">
      <TerminalLoader messages={loaderMessages} size="sm" />
      <div className={cn(gridClass)}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} variant={variant} />
        ))}
      </div>
    </div>
  );
}
