/**
 * StatusStripSkeleton — loading placeholder for StatusStrip.
 * Matches the real strip's dimensions to prevent layout shift.
 */
export default function StatusStripSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border/50 bg-card rounded-sm p-3 animate-pulse">
          <div className="h-2 w-16 rounded-sm bg-secondary/60 mb-2" />
          <div className="h-5 w-10 rounded-sm bg-secondary/80" />
        </div>
      ))}
    </div>
  );
}