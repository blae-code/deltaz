export default function HeatmapLegend({ mode }) {
  return (
    <div className="border border-border rounded-sm p-3 bg-card space-y-2">
      <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase font-semibold">
        Legend — {mode === "contested" ? "Contested" : mode === "density" ? "Density" : "Shifts"}
      </p>

      {mode === "contested" && (
        <div className="space-y-1.5">
          <LegendItem color="rgba(223, 129, 22, 0.4)" border="rgba(223, 129, 22, 0.7)" label="SECURED" />
          <LegendItem color="rgba(212, 161, 58, 0.4)" border="rgba(212, 161, 58, 0.7)" label="CONTESTED" dashed />
          <LegendItem color="rgba(197, 48, 48, 0.4)" border="rgba(197, 48, 48, 0.7)" label="HOSTILE" dashed />
          <LegendItem color="rgba(100, 100, 120, 0.15)" border="rgba(100, 100, 120, 0.3)" label="UNCHARTED" />
        </div>
      )}

      {mode === "density" && (
        <div className="space-y-1.5">
          <p className="text-[8px] text-muted-foreground">
            Each sector shows the controlling faction's color. Opacity reflects control strength.
          </p>
          <div className="flex gap-1 items-center">
            <div className="h-3 flex-1 rounded-sm" style={{ background: "linear-gradient(to right, rgba(255,255,255,0.05), rgba(223,129,22,0.6))" }} />
          </div>
          <div className="flex justify-between text-[7px] text-muted-foreground tracking-wider">
            <span>NO CONTROL</span>
            <span>FULL CONTROL</span>
          </div>
        </div>
      )}

      {mode === "frontline" && (
        <div className="space-y-1.5">
          <LegendItem color="rgba(223, 129, 22, 0.3)" border="rgba(223, 129, 22, 0.6)" label="STABLE" />
          <LegendItem color="rgba(212, 161, 58, 0.3)" border="rgba(212, 161, 58, 0.6)" label="RECENTLY CHANGED" dashed />
          <LegendItem color="rgba(197, 48, 48, 0.3)" border="rgba(197, 48, 48, 0.6)" label="ACTIVE FRONT LINE" dashed />
          <p className="text-[8px] text-muted-foreground mt-1">
            Arrows show faction displacement direction when control shifts between clans.
          </p>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, border, label, dashed }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-3 w-5 rounded-sm"
        style={{
          backgroundColor: color,
          border: `1px ${dashed ? "dashed" : "solid"} ${border}`,
        }}
      />
      <span className="text-[8px] font-mono tracking-wider text-foreground/70">{label}</span>
    </div>
  );
}