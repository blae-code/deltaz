import { useRef, useEffect, useMemo } from "react";

const STATUS_SCORES = {
  allied: 2,
  trade_agreement: 1,
  ceasefire: 0.5,
  neutral: 0,
  hostile: -1,
  war: -2,
};

const STATUS_COLORS = {
  allied: "#df8116",
  trade_agreement: "#c8935b",
  ceasefire: "#d4911a",
  neutral: "#4a4e5a",
  hostile: "#c47b2a",
  war: "#c53030",
};

const STATUS_LABELS = {
  allied: "Allied",
  trade_agreement: "Trade Pact",
  ceasefire: "Ceasefire",
  neutral: "Neutral",
  hostile: "Hostile",
  war: "War",
};

export default function DiplomacyTensionChart({ factions, relations, selectedFactionId, onSelectFaction }) {
  const canvasRef = useRef(null);

  const positions = useMemo(() => {
    if (factions.length === 0) return [];
    const cx = 200;
    const cy = 180;
    const radius = Math.min(140, 60 + factions.length * 12);
    return factions.map((f, i) => {
      const angle = (i / factions.length) * 2 * Math.PI - Math.PI / 2;
      return {
        id: f.id,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        color: f.color || "hsl(32, 82%, 48%)",
        name: f.name,
        tag: f.tag,
      };
    });
  }, [factions]);

  const getRelation = (aId, bId) => {
    return relations.find(
      (r) =>
        (r.faction_a_id === aId && r.faction_b_id === bId) ||
        (r.faction_a_id === bId && r.faction_b_id === aId)
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || positions.length === 0) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 360 * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 400, 360);

    // Draw connections
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const rel = getRelation(a.id, b.id);
        const status = rel?.status || "neutral";
        const color = STATUS_COLORS[status] || STATUS_COLORS.neutral;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        if (status === "war") {
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = color;
        } else if (status === "hostile") {
          ctx.setLineDash([6, 3]);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = color;
        } else if (status === "allied") {
          ctx.setLineDash([]);
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
        } else if (status === "trade_agreement") {
          ctx.setLineDash([]);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = color;
        } else {
          ctx.setLineDash([2, 6]);
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = color + "60";
        }

        // Dim connections not involving selected faction
        if (selectedFactionId && a.id !== selectedFactionId && b.id !== selectedFactionId) {
          ctx.globalAlpha = 0.15;
        } else {
          ctx.globalAlpha = 0.8;
        }

        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    // Draw nodes
    positions.forEach((p) => {
      const isSelected = selectedFactionId === p.id;
      const isConnected = !selectedFactionId || selectedFactionId === p.id ||
        relations.some(
          (r) =>
            (r.faction_a_id === selectedFactionId && r.faction_b_id === p.id) ||
            (r.faction_a_id === p.id && r.faction_b_id === selectedFactionId)
        );
      const alpha = selectedFactionId && !isConnected ? 0.3 : 1;

      ctx.globalAlpha = alpha;

      // Glow
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = p.color + "30";
        ctx.fill();
      }

      // Node
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? p.color : p.color + "cc";
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Tag label
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#c0c5ce";
      ctx.fillText(p.tag, p.x, p.y + 24);

      ctx.globalAlpha = 1;
    });
  }, [positions, relations, selectedFactionId]);

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const p of positions) {
      const dx = x - p.x;
      const dy = y - p.y;
      if (dx * dx + dy * dy < 225) {
        onSelectFaction(p.id === selectedFactionId ? null : p.id);
        return;
      }
    }
    onSelectFaction(null);
  };

  if (factions.length < 2) {
    return (
      <div className="text-center py-8 text-[10px] text-muted-foreground">
        Need at least 2 clans to visualize diplomatic tensions.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={400}
        height={360}
        className="w-full max-w-[400px] mx-auto cursor-pointer"
        style={{ aspectRatio: "400/360" }}
        onClick={handleCanvasClick}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded-sm inline-block"
              style={{ backgroundColor: STATUS_COLORS[key] }}
            />
            <span className="text-[9px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}