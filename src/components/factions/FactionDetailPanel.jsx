import DataCard from "../terminal/DataCard";
import FactionMemberList from "./FactionMemberList";
import ModifierBreakdown from "../market/ModifierBreakdown";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, Coins, TrendingUp, TrendingDown, Minus } from "lucide-react";

const resourceIcons = { fuel: "⛽", metals: "⚙", tech: "💾", food: "🌾", munitions: "🔫" };

export default function FactionDetailPanel({ faction, economy, territories, members, diplomacy, factions }) {
  if (!faction) return null;

  const prod = economy?.resource_production || {};
  const heldTerritories = territories.filter((t) => t.controlling_faction_id === faction.id);
  const net = (economy?.last_cycle_income || 0) - (economy?.last_cycle_tax || 0);

  const relations = diplomacy
    .filter((d) => d.faction_a_id === faction.id || d.faction_b_id === faction.id)
    .map((d) => {
      const otherId = d.faction_a_id === faction.id ? d.faction_b_id : d.faction_a_id;
      const other = factions.find((f) => f.id === otherId);
      return { ...d, otherName: other?.name || "Unknown", otherTag: other?.tag || "?", otherColor: other?.color };
    });

  const statusStyle = {
    allied: "bg-status-ok/10 text-status-ok border-status-ok/20",
    trade_agreement: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    ceasefire: "bg-accent/10 text-accent border-accent/20",
    neutral: "bg-muted text-muted-foreground",
    hostile: "bg-status-warn/10 text-status-warn border-status-warn/20",
    war: "bg-status-danger/10 text-status-danger border-status-danger/20",
  };

  return (
    <div className="space-y-4">
      {/* Faction Header */}
      <div className="border border-border bg-card rounded-sm p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-12 w-12 rounded-sm border flex items-center justify-center"
            style={{
              borderColor: faction.color || "hsl(var(--border))",
              backgroundColor: (faction.color || "transparent") + "20",
            }}
          >
            <Shield className="h-6 w-6" style={{ color: faction.color || "hsl(var(--primary))" }} />
          </div>
          <div>
            <h3 className="text-base font-bold font-display tracking-wider" style={{ color: faction.color }}>
              {faction.name} <span className="text-muted-foreground text-xs">{faction.tag}</span>
            </h3>
            <Badge variant="outline" className="text-[9px] uppercase mt-0.5">{faction.status}</Badge>
          </div>
        </div>
        {faction.description && (
          <p className="text-xs text-muted-foreground">{faction.description}</p>
        )}

        {/* Economy Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="border border-border rounded-sm p-2 text-center">
            <Coins className="h-3 w-3 mx-auto text-accent mb-1" />
            <div className="text-[9px] text-muted-foreground">WEALTH</div>
            <div className="text-sm font-bold text-primary font-display">{economy?.wealth?.toLocaleString() || 0}</div>
          </div>
          <div className="border border-border rounded-sm p-2 text-center">
            <MapPin className="h-3 w-3 mx-auto text-primary mb-1" />
            <div className="text-[9px] text-muted-foreground">ZONES</div>
            <div className="text-sm font-bold text-foreground font-display">{heldTerritories.length}</div>
          </div>
          <div className="border border-border rounded-sm p-2 text-center">
            <div className="text-[9px] text-muted-foreground">INCOME</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {net > 0 ? <TrendingUp className="h-3 w-3 text-status-ok" /> : net < 0 ? <TrendingDown className="h-3 w-3 text-status-danger" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
              <span className={`text-sm font-bold font-display ${net > 0 ? "text-status-ok" : net < 0 ? "text-status-danger" : "text-muted-foreground"}`}>
                {net >= 0 ? "+" : ""}{net}
              </span>
            </div>
          </div>
          <div className="border border-border rounded-sm p-2 text-center">
            <div className="text-[9px] text-muted-foreground">EMBARGO</div>
            <div className={`text-sm font-bold font-display ${economy?.trade_embargo ? "text-status-danger" : "text-status-ok"}`}>
              {economy?.trade_embargo ? "YES" : "NO"}
            </div>
          </div>
        </div>

        {/* Resources */}
        {Object.keys(prod).length > 0 && (
          <div className="mt-3">
            <div className="text-[9px] text-muted-foreground tracking-wider mb-1.5">RESOURCE PRODUCTION</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(prod).filter(([_, v]) => v > 0).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded-sm px-2 py-1">
                  <span className="text-sm">{resourceIcons[key] || "📦"}</span>
                  <span className="text-[10px] uppercase text-foreground">{key}</span>
                  <span className="text-[10px] font-bold text-primary font-mono">{val}/cycle</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Diplomatic Relations */}
      {relations.length > 0 && (
        <DataCard title="Diplomatic Relations">
          <div className="space-y-1.5">
            {relations.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 border border-border/50 rounded-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3" style={{ color: r.otherColor }} />
                  <span className="text-xs font-semibold" style={{ color: r.otherColor }}>
                    {r.otherName}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{r.otherTag}</span>
                </div>
                <Badge variant="outline" className={`text-[9px] uppercase ${statusStyle[r.status] || ""}`}>
                  {r.status?.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
          {relations.some((r) => r.terms) && (
            <div className="mt-2 space-y-1">
              {relations.filter((r) => r.terms).map((r) => (
                <p key={r.id + "-terms"} className="text-[9px] text-muted-foreground italic">
                  {r.otherName}: {r.terms}
                </p>
              ))}
            </div>
          )}
        </DataCard>
      )}

      {/* Territories */}
      {heldTerritories.length > 0 && (
        <DataCard title={`Controlled Territories (${heldTerritories.length})`}>
          <div className="grid grid-cols-2 gap-2">
            {heldTerritories.map((t) => (
              <div key={t.id} className="border border-border/50 rounded-sm px-3 py-2">
                <div className="text-xs font-semibold text-foreground">{t.name}</div>
                <div className="text-[9px] text-muted-foreground">{t.sector} · {t.threat_level} threat · {t.status}</div>
                {t.resources?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {t.resources.map((r) => (
                      <span key={r} className="text-[10px]">{resourceIcons[r] || "📦"}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DataCard>
      )}

      {/* Members */}
      <DataCard title={`Active Operatives (${members.length})`}>
        <FactionMemberList members={members} />
      </DataCard>
    </div>
  );
}