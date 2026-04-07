import RadioTowerSvg from "../svg/RadioTowerSvg";

export default function AuthLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6">
      <div className="h-20 w-20 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center pulse-glow">
        <RadioTowerSvg size={48} animated className="text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-lg font-bold font-display tracking-[0.3em] text-primary uppercase">
          Dead Signal
        </h1>
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-0.5 bg-primary/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono tracking-widest animate-pulse">
            AUTHENTICATING...
          </span>
          <div className="w-5 h-0.5 bg-primary/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}