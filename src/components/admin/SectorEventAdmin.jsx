import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Loader2, RefreshCw, Cloud, MapPin, AlertTriangle,
  Crosshair, Radio, Megaphone, Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

export default function SectorEventAdmin() {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    const [ev, bc] = await Promise.all([
      base44.entities.Event.filter({ is_active: true }, "-created_date", 15),
      base44.entities.Broadcast.filter({ auto_generated: true }, "-created_date", 10),
    ]);
    setRecentEvents(ev);
    setRecentBroadcasts(bc);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const runEngine = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("sectorEventEngine", {});
      setLastResult(res.data);
      toast({
        title: "Sector Event Engine Complete",
        description: `${res.data.events_created} events, ${res.data.broadcasts_created} broadcasts, ${res.data.missions_created} missions`,
      });
      await loadData();
    } catch (err) {
      toast({ title: "Engine failed", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const clearOldBroadcasts = async () => {
    const old = recentBroadcasts.filter(b => {
      if (!b.expires_at) return false;
      return new Date(b.expires_at) < new Date();
    });
    for (const b of old) {
      await base44.entities.Broadcast.delete(b.id);
    }
    toast({ title: `Cleared ${old.length} expired broadcasts` });
    await loadData();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={runEngine}
          disabled={running}
          className="font-mono text-xs uppercase tracking-wider"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
          {running ? "GENERATING EVENTS..." : "TRIGGER SECTOR EVENTS"}
        </Button>
        <Button
          variant="outline"
          onClick={clearOldBroadcasts}
          className="font-mono text-xs uppercase tracking-wider"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          CLEAR EXPIRED
        </Button>
      </div>

      {/* Description */}
      <div className="border border-border rounded-sm p-3 bg-secondary/30">
        <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
          The Sector Event Engine generates random events across the game world — environmental hazards, supply drops, anomalies, resource surges, infrastructure failures, and hostile incursions. Each event automatically creates a <span className="text-primary">broadcast transmission</span> and a <span className="text-accent">response mission</span> for the nearest faction.
        </p>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="border border-primary/20 bg-primary/5 rounded-sm p-3 space-y-2">
          <h4 className="text-[10px] font-mono tracking-widest text-primary uppercase">Last Run Results</h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <MiniStat label="Events" value={lastResult.events_created} />
            <MiniStat label="Broadcasts" value={lastResult.broadcasts_created} />
            <MiniStat label="Missions" value={lastResult.missions_created} />
            <MiniStat label="Map Updated" value={lastResult.territories_updated} />
          </div>
          {lastResult.details?.map((d, i) => (
            <div key={i} className="border border-border/50 rounded-sm p-2 text-[9px] font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[7px]">{d.sector}</Badge>
                <span className="text-accent">{d.category}</span>
              </div>
              <p className="text-foreground mt-0.5">{d.event}</p>
              <p className="text-muted-foreground"><Megaphone className="h-2.5 w-2.5 inline mr-1" />{d.broadcast}</p>
              <p className="text-primary"><Crosshair className="h-2.5 w-2.5 inline mr-1" />{d.mission}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Auto-Broadcasts */}
      <div>
        <h4 className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
          Recent Auto-Generated Broadcasts ({recentBroadcasts.length})
        </h4>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : recentBroadcasts.length === 0 ? (
          <p className="text-[10px] text-muted-foreground font-mono">No auto-generated broadcasts yet.</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {recentBroadcasts.map(bc => (
              <div key={bc.id} className="border border-border/50 rounded-sm p-2 text-[9px] font-mono flex items-start gap-2">
                <Radio className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{bc.title}</span>
                    {bc.sector && <Badge variant="outline" className="text-[7px]">{bc.sector}</Badge>}
                    <Badge variant="outline" className="text-[7px] uppercase">{bc.channel}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{bc.content}</p>
                  <span className="text-muted-foreground/60">{moment(bc.created_date).fromNow()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="border border-border/50 rounded-sm p-1.5">
      <p className="text-sm font-bold font-mono text-primary">{value}</p>
      <p className="text-[7px] text-muted-foreground uppercase">{label}</p>
    </div>
  );
}