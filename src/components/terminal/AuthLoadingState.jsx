import { User } from "lucide-react";

/**
 * AuthLoadingState — shown when a page is waiting for user authentication
 * to resolve before it can load user-specific data. Prevents empty flashes.
 */
export default function AuthLoadingState({ message }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-2">
        <div className="h-8 w-8 rounded-sm bg-secondary/60 flex items-center justify-center mx-auto">
          <User className="h-4 w-4 text-muted-foreground animate-pulse" />
        </div>
        <p className="text-[10px] text-muted-foreground font-mono tracking-widest animate-pulse">
          {message || "AUTHENTICATING OPERATIVE..."}
        </p>
      </div>
    </div>
  );
}