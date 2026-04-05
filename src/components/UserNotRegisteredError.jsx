import { Radio, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const UserNotRegisteredError = () => {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-sm bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold font-display tracking-[0.2em] text-destructive uppercase">
            Access Denied
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-widest font-mono">
            OPERATIVE NOT REGISTERED IN DEAD SIGNAL DATABASE
          </p>
        </div>

        {/* Info card */}
        <div className="border border-border bg-card rounded-sm p-5 space-y-4">
          <p className="text-xs text-foreground leading-relaxed font-mono">
            Your credentials are valid, but you are not cleared for access to this terminal. Contact your commanding officer or server admin to request registration.
          </p>

          <div className="border border-border bg-secondary/50 rounded-sm p-3 space-y-2">
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase font-semibold">
              Troubleshooting
            </p>
            <ul className="space-y-1.5 text-[10px] text-muted-foreground font-mono">
              <li className="flex items-start gap-2">
                <span className="text-primary">&gt;</span>
                Verify you're using the correct account
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">&gt;</span>
                Ask a server admin to add you to the roster
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">&gt;</span>
                Try disconnecting and re-authenticating
              </li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full text-xs font-mono uppercase tracking-wider text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Disconnect Terminal
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-[9px] text-muted-foreground/40">
          <Radio className="h-3 w-3" />
          <span className="tracking-widest">DEAD SIGNAL FIELD TERMINAL v2.1</span>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;