import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, User, MessageCircle, ChevronRight, ChevronLeft, AlertTriangle, Loader2, Skull } from "lucide-react";
import { ORIGIN_STEPS, compileOriginEffects } from "../components/onboarding/originSteps";
import OriginStoryStep from "../components/onboarding/OriginStoryStep";
import OriginSummary from "../components/onboarding/OriginSummary";

const TOTAL_STEPS = 3 + ORIGIN_STEPS.length; // callsign + discord + 6 origin steps + finalize

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [callsign, setCallsign] = useState("");
  const [discord, setDiscord] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [originChoices, setOriginChoices] = useState([]); // array of choice objects
  const [generatingProfile, setGeneratingProfile] = useState(false);

  const handleOriginChoice = (stepIndex, choice) => {
    const newChoices = [...originChoices];
    newChoices[stepIndex] = choice;
    setOriginChoices(newChoices);
  };

  const currentOriginStep = step - 3; // 0-indexed into ORIGIN_STEPS (steps 3-8 are origin)
  const isOriginStep = step >= 3 && step < 3 + ORIGIN_STEPS.length;
  const isFinalStep = step === 3 + ORIGIN_STEPS.length;

  const handleSubmit = async () => {
    if (!callsign.trim() || !discord.trim()) {
      setError("Missing required information.");
      return;
    }
    setError("");
    setSaving(true);
    setGeneratingProfile(true);

    // Compile origin effects
    const compiled = compileOriginEffects(originChoices.filter(Boolean));
    const rawChoices = originChoices.filter(Boolean).map((c, i) => ({
      step: ORIGIN_STEPS[i]?.title || `Step ${i + 1}`,
      label: c.label,
      id: c.id,
    }));

    // Call backend to generate AI profile + create entities
    await base44.functions.invoke("finalizeOrigin", {
      compiled,
      callsign: callsign.trim(),
      raw_choices: rawChoices,
    });

    // Save user data
    await base44.auth.updateMe({
      callsign: callsign.trim(),
      discord_username: discord.trim(),
      is_onboarded: true,
      status: "active",
    });

    setGeneratingProfile(false);
    setSaving(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-sm bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto">
            {isOriginStep ? <Skull className="h-7 w-7 text-primary" /> : <Radio className="h-7 w-7 text-primary" />}
          </div>
          <h1 className="text-xl font-bold font-display tracking-widest text-primary uppercase">
            {isOriginStep ? "Origin Story" : "Dead Signal"}
          </h1>
          <p className="text-xs text-muted-foreground tracking-wider font-mono">
            {isOriginStep
              ? `CHAPTER ${currentOriginStep + 1} OF ${ORIGIN_STEPS.length}`
              : "FIELD TERMINAL — OPERATIVE REGISTRATION"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i + 1 <= step ? "bg-primary" : i + 1 === step + 1 ? "bg-primary/30" : "bg-border"
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
                  This is how you'll be identified across all Dead Signal operations.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">CALLSIGN</Label>
              <Input
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="e.g. GHOST-7, Reaper, NightOwl..."
                className="h-10 text-sm bg-secondary/50 border-border font-mono"
                maxLength={24}
                autoFocus
              />
            </div>

            <Button
              onClick={() => {
                if (!callsign.trim()) { setError("Enter a callsign to continue."); return; }
                setError(""); setStep(2);
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
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-semibold font-display tracking-wider text-foreground uppercase">
                  Link Discord Profile
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Enter your Discord username for identity verification and server sync.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">DISCORD USERNAME</Label>
              <Input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="e.g. ghostoperator or ghost#1234"
                className="h-10 text-sm bg-secondary/50 border-border font-mono"
                maxLength={40}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="font-mono text-xs uppercase tracking-wider">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> BACK
              </Button>
              <Button
                onClick={() => {
                  if (!discord.trim()) { setError("Discord username required."); return; }
                  setError(""); setStep(3);
                }}
                className="flex-1 font-mono text-xs uppercase tracking-wider"
              >
                BEGIN ORIGIN STORY <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Origin Story Steps (steps 3 through 3+ORIGIN_STEPS.length-1) */}
        {isOriginStep && (
          <div className="border border-border bg-card rounded-sm p-6 space-y-5">
            <OriginStoryStep
              step={ORIGIN_STEPS[currentOriginStep]}
              onChoice={(choice) => handleOriginChoice(currentOriginStep, choice)}
              chosenId={originChoices[currentOriginStep]?.id}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="font-mono text-xs uppercase tracking-wider"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> BACK
              </Button>
              <Button
                onClick={() => {
                  if (!originChoices[currentOriginStep]) { setError("Make a choice to continue."); return; }
                  setError(""); setStep(step + 1);
                }}
                disabled={!originChoices[currentOriginStep]}
                className="flex-1 font-mono text-xs uppercase tracking-wider"
              >
                {currentOriginStep === ORIGIN_STEPS.length - 1 ? "REVIEW DOSSIER" : "CONTINUE"}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Final Step: Review + Submit */}
        {isFinalStep && (
          <div className="border border-border bg-card rounded-sm p-6 space-y-5">
            <div className="space-y-2">
              <h2 className="text-sm font-bold font-display tracking-widest text-primary uppercase">
                Your Origin Is Written
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your choices have shaped who you are. ARTEMIS, GHOST PROTOCOL, and Mission Forge will reference your
                origin throughout your time in the wasteland. Every mission briefing, every tactical advisory, every
                narrative event will be influenced by the survivor you've become.
              </p>
            </div>

            <OriginSummary choices={originChoices.filter(Boolean)} callsign={callsign} />

            {generatingProfile && (
              <div className="flex items-center justify-center gap-3 py-4 border border-primary/20 bg-primary/5 rounded-sm">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <div>
                  <p className="text-xs text-primary font-mono tracking-wider">GENERATING YOUR DOSSIER...</p>
                  <p className="text-[9px] text-muted-foreground">AI is writing your backstory and initializing faction standings</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={saving}
                className="font-mono text-xs uppercase tracking-wider"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> BACK
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 font-mono text-xs uppercase tracking-wider"
              >
                {saving ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> CREATING OPERATIVE...</>
                ) : (
                  "ENTER THE WASTELAND"
                )}
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

        {/* Persistent summary bar */}
        {step >= 2 && callsign.trim() && !isFinalStep && (
          <div className="border border-primary/20 bg-primary/5 rounded-sm p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-foreground font-mono">
                Callsign: <span className="text-primary font-semibold">{callsign}</span>
              </p>
              {discord.trim() && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  Discord: {discord}
                </p>
              )}
            </div>
            {originChoices.filter(Boolean).length > 0 && (
              <span className="text-[9px] text-primary font-mono tracking-wider">
                {originChoices.filter(Boolean).length}/{ORIGIN_STEPS.length} CHOICES
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}