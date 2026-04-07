import ScanPulseSvg from "../svg/ScanPulseSvg";

/**
 * AuthLoadingState — shown when a page is waiting for user authentication
 * to resolve before it can load user-specific data. Prevents empty flashes.
 */
export default function AuthLoadingState({ message }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-3">
        <div className="mx-auto">
          <ScanPulseSvg size={48} className="text-primary mx-auto" />
        </div>
        <p className="text-[10px] text-muted-foreground font-mono tracking-widest animate-pulse">
          {message || "AUTHENTICATING OPERATIVE..."}
        </p>
      </div>
    </div>
  );
}