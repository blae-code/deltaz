import { Badge } from "@/components/ui/badge";
import StatusIndicator from "../terminal/StatusIndicator";
import { Shield, Users, MapPin, Coins, Package } from "lucide-react";

const statusMap = {
  active: "online",
  disbanded: "offline",
  hostile: "critical",
  allied: "online",
};

const resourceIcons = { fuel: "⛽", metals: "⚙", tech: "💾", food: "🌾", munitions: "🔫" };

export default function FactionCard({ faction, economy, territories, members, diplomacy, factions, selected, onSelect }) {
  const prod = economy?.resource_production || {};
  const heldTerritories = territories.filter((t) => t.controlling_faction_id === faction.id);

  // Diplomatic summary
  const relations = diplomacy.filter(
    (d) => d.faction_a_id === faction.id || d.faction_b_id === faction.id
  );
  const allies = relations.filter((r) => r.status === "allied" || r.status === "trade_agreement");
  const enemies = relations.filter((r) => r.status === "hostile" || r.status === "war");

  return (
    <button
      onClick={() => onSelect(faction.id)}
      className={`w-full text-left border rounded-sm overflow-hidden transition-all ${
        selected
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3 bg-secondary/30">
        <div
          className="h-9 w-9 rounded-sm border flex items-center justify-center shrink-0"
          style={{
            borderColor: faction.color || "hsl(var(--border))",
            backgroundColor: (faction.color || "transparent") + "20",
          }}
        >
          <Shield className="h-4 w-4" style={{ color: faction.color || "hsl(var(--primary))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-display text-foreground truncate">{faction.name}</h3>
            <Badge variant="outline" className="text-[10px] shrink-0">{faction.tag}</Badge>
          </div>
          <StatusIndicator status={statusMap[faction.status] || "offline"} label={faction.status} className="mt-0.5" />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {faction.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">{faction.description}</p>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{members.length} MEMBERS</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{heldTerritories.length} ZONES</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Coins className="h-3 w-3" />
            <span>{economy?.wealth?.toLocaleString() || 0} CR</span>
          </div>
        </div>

        {/* Resources */}
        {Object.keys(prod).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(prod).filter(([_, v]) => v > 0).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1 bg-secondary/50 border border-border rounded-sm px-1.5 py-0.5">
                <span className="text-[10px]">{resourceIcons[key] || "📦"}</span>
                <span className="text-[9px] font-mono text-primary">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Diplomacy Summary */}
        <div className="flex gap-2 flex-wrap">
          {allies.length > 0 && (
            <Badge variant="outline" className="text-[8px] bg-status-ok/10 text-status-ok border-status-ok/20">
              {allies.length} ALLY
            </Badge>
          )}
          {enemies.length > 0 && (
            <Badge variant="outline" className="text-[8px] bg-status-danger/10 text-status-danger border-status-danger/20">
              {enemies.length} HOSTILE
            </Badge>
          )}
          {allies.length === 0 && enemies.length === 0 && (
            <Badge variant="outline" className="text-[8px]">NEUTRAL</Badge>
          )}
        </div>
      </div>
    </button>
  );
}