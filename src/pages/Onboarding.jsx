import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, User, MessageCircle, ChevronRight, AlertTriangle } from "lucide-react";

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [callsign, setCallsign] = useState("");
  const [discord, setDiscord] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!callsign.trim()) {
      setError("Callsign is required to proceed.");
      return;
    }
    if (!discord.trim()) {
      setError("Discord username is required for identity verification.");
      return;
    }
    setError("");
    setSaving(true);
    await base44.auth.updateMe({
      callsign: callsign.trim(),
      discord_username: discord.trim(),
      is_onboarded: true,
      status: "active",
    });
    setSaving(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto">
            <Radio className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-display tracking-widest text-primary uppercase">
            Dead Signal
          </h1>
          <p className="text-xs text-muted-foreground tracking-wider font-mono">
            FIELD TERMINAL — OPERATIVE REGISTRATION
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Callsign */}
        {step === 1 && (
          <div className="border border-border bg-card rounded-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-semibold font-display tracking-wider text-foreground uppercase">
                  Choose Your Callsign
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  This is how you'll be identified across all Dead Signal operations. Your real name will never be shown.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                CALLSIGN
              </Label>
              <Input
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="e.g. GHOST-7, Reaper, NightOwl..."
                className="h-10 text-sm bg-secondary/50 border-border font-mono"
                maxLength={24}
                autoFocus
              />
              <p className="text-[9px] text-muted-foreground">
                Tip: Use your Discord display name or a tactical handle you go by.
              </p>
            </div>

            <Button
              onClick={() => {
                if (!callsign.trim()) {
                  setError("Enter a callsign to continue.");
                  return;
                }
                setError("");
                setStep(2);
              }}
              className="w-full font-mono text-xs uppercase tracking-wider"
            >
              CONTINUE <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Discord Link */}
        {step === 2 && (
          <div className="border border-border bg-card rounded-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-chart-4" />
              <div>
                <h2 className="text-sm font-semibold font-display tracking-wider text-foreground uppercase">
                  Link Discord Profile
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Enter your Discord username so we can verify your identity and sync with the server.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                DISCORD USERNAME
              </Label>
              <Input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="e.g. ghostoperator or ghost#1234"
                className="h-10 text-sm bg-secondary/50 border-border font-mono"
                maxLength={40}
                autoFocus
              />
              <p className="text-[9px] text-muted-foreground">
                This links your Dead Signal profile to your Discord account for coordination and stat tracking.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="font-mono text-xs uppercase tracking-wider"
              >
                BACK
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 font-mono text-xs uppercase tracking-wider"
              >
                {saving ? "REGISTERING..." : "COMPLETE REGISTRATION"}
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-destructive text-xs font-mono">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary */}
        {step === 2 && callsign.trim() && (
          <div className="border border-primary/20 bg-primary/5 rounded-sm p-3 space-y-1">
            <p className="text-[10px] text-primary tracking-wider font-mono uppercase font-semibold">
              REGISTRATION PREVIEW
            </p>
            <p className="text-xs text-foreground font-mono">
              Callsign: <span className="text-primary font-semibold">{callsign}</span>
            </p>
            {discord.trim() && (
              <p className="text-xs text-foreground font-mono">
                Discord: <span className="text-chart-4">{discord}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}