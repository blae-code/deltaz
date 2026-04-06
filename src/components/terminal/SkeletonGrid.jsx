import SkeletonCard from "./SkeletonCard";
import { cn } from "@/lib/utils";

/**
 * SkeletonGrid — renders a grid of skeleton cards for loading states.
 * @param {number} count - how many cards to show
 * @param {string} variant - "mission" | "inventory" | "project"
 * @param {string} cols - grid column classes (defaults differ by variant)
 */
export default function SkeletonGrid({ count = 6, variant = "default", cols }) {
  const gridClass = cols || (
    variant === "mission" ? "grid gap-2" :
    variant === "inventory" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-2" :
    variant === "project" ? "grid gap-2" :
    "grid md:grid-cols-2 gap-2"
  );

  return (
    <div className={cn(gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}