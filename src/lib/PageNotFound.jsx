import { Link, useLocation } from 'react-router-dom';
import { Radio, ArrowLeft, Home } from 'lucide-react';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="flex items-center justify-center p-6 h-full">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="h-16 w-16 mx-auto rounded-sm border border-destructive/30 bg-destructive/10 flex items-center justify-center">
            <Radio className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-4xl font-bold font-display text-destructive tracking-wider">404</h1>
          <div className="h-px w-16 bg-border mx-auto" />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold font-display tracking-widest text-foreground uppercase">
            SIGNAL LOST
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Target <span className="text-accent">"/{pageName}"</span> could not be resolved on this terminal.
          </p>
          <p className="text-[10px] text-muted-foreground/60 font-mono">
            The frequency may have shifted, or this sector was never mapped.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono tracking-wider text-muted-foreground border border-border rounded-sm bg-secondary/50 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            GO BACK
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono tracking-wider text-primary border border-primary/30 rounded-sm bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            RETURN TO SITREP
          </Link>
        </div>

        <div className="pt-4 border-t border-border/30">
          <p className="text-[8px] text-muted-foreground/40 font-mono tracking-widest">
            ERR::ROUTE_NOT_FOUND — DEAD SIGNAL TERMINAL v2.1
          </p>
        </div>
      </div>
    </div>
  );
}