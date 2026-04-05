import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Pause, Play, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function TradeRouteList({ routes, factions, onUpdate }) {
  const { toast } = useToast();

  const toggleRoute = async (route) => {
    const newStatus = route.status === "active" ? "paused" : "active";
    await base44.entities.TradeRoute.update(route.id, { status: newStatus });
    toast({ title: `Route ${newStatus}` });
    onUpdate?.();
  };

  const cancelRoute = async (route) => {
    await base44.entities.TradeRoute.update(route.id, { status: "cancelled" });
    toast({ title: "Route cancelled" });
    onUpdate?.();
  };

  const getFaction = (id) => factions.find(f => f.id === id);

  if (routes.length === 0) {
    return <p className="text-[10px] text-muted-foreground font-mono text-center py-4">NO ACTIVE TRADE ROUTES</p>;
  }

  return (
    <div className="space-y-2">
      {routes.map(route => {
        const from = getFaction(route.from_faction_id);
        const to = getFaction(route.to_faction_id);
        const cycleCost = (route.amount || 0) * (route.price_per_unit || 0);

        return (
          <div key={route.id} className="border border-border rounded-sm p-3 flex items-center gap-3">
            {/* Route info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: from?.color }}>{from?.tag || "?"}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold" style={{ color: to?.color }}>{to?.tag || "?"}</span>
                <Badge variant={route.status === "active" ? "default" : "outline"} className="text-[8px]">
                  {route.status?.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{route.amount} {route.resource_type?.toUpperCase()}/cycle</span>
                <span>@ {route.price_per_unit} cr/unit</span>
                <span className="text-primary">{cycleCost} cr/cycle</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground/70">
                <span>Total moved: {route.total_transferred || 0}</span>
                <span>Revenue: {(route.total_revenue || 0).toLocaleString()} cr</span>
                <span>Cycles: {route.cycles_active || 0}</span>
              </div>
            </div>

            {/* Actions */}
            {route.status !== "cancelled" && (
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleRoute(route)}>
                  {route.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => cancelRoute(route)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}