import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Database, Loader2, Radio, RefreshCw, ShieldCheck } from "lucide-react";

function StatBadge({ label, value }) {
  return (
    <Badge variant="outline" className="text-[10px] font-mono">
      {label}: {value}
    </Badge>
  );
}

export default function CatalogOpsPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningAction, setRunningAction] = useState("");
  const { toast } = useToast();

  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("gameDataOps", { action: "get_status" });
      setStatus(response?.data?.state || null);
    } catch (error) {
      toast({
        title: "Catalog status failed",
        description: error?.message || "Unable to read catalog state.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const runAction = async (action) => {
    setRunningAction(action);
    try {
      const response = await base44.functions.invoke("gameDataOps", { action });
      setStatus(response?.data?.state || null);
      toast({ title: `Catalog action complete`, description: `${action} finished successfully.` });
    } catch (error) {
      toast({
        title: `Catalog action failed`,
        description: error?.message || `Unable to run ${action}.`,
        variant: "destructive",
      });
    } finally {
      setRunningAction("");
    }
  };

  if (loading && !status) {
    return <div className="text-[10px] text-primary animate-pulse tracking-widest py-4">LOADING CATALOG OPS...</div>;
  }

  const backfillCounts = status?.backfill_counts || {};
  const sourceManifest = Array.isArray(status?.source_manifest) ? status.source_manifest : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <StatBadge label="ACTIVE VERSION" value={status?.active_catalog_version || "UNSET"} />
        <StatBadge label="MODE" value={(status?.active_sync_mode || "snapshot").toUpperCase()} />
        <StatBadge label="ITEMS" value={status?.item_count || 0} />
        <StatBadge label="RECIPES" value={status?.recipe_count || 0} />
        <StatBadge label="BACKFILL" value={(status?.backfill_status || "idle").toUpperCase()} />
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={loadStatus} className="text-[10px] font-mono h-7" disabled={Boolean(runningAction)}>
          <RefreshCw className="h-3 w-3 mr-1" /> REFRESH
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="border border-border rounded-sm p-4 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h4 className="text-[10px] font-mono tracking-widest text-muted-foreground">CATALOG STATE</h4>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-[10px]">
            <div className="border border-border/60 rounded-sm p-3 bg-secondary/20">
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider font-mono">Snapshot Reference</div>
              <div className="mt-1 text-foreground font-mono">{status?.snapshot_reference?.version || "UNSET"}</div>
              <div className="mt-1 text-muted-foreground font-mono">
                {status?.snapshot_reference?.items || 0} items · {status?.snapshot_reference?.recipes || 0} recipes
              </div>
            </div>
            <div className="border border-border/60 rounded-sm p-3 bg-secondary/20">
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider font-mono">Live Reference</div>
              <div className="mt-1 text-foreground font-mono">{status?.live_catalog_version || "NONE"}</div>
              <div className="mt-1 text-muted-foreground font-mono">
                Last live sync: {status?.last_live_sync_at || "Never"}
              </div>
            </div>
            <div className="border border-border/60 rounded-sm p-3 bg-secondary/20">
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider font-mono">Backfill Progress</div>
              <div className="mt-1 text-foreground font-mono">
                scanned {backfillCounts.scanned || 0} · updated {backfillCounts.updated || 0}
              </div>
              <div className="mt-1 text-muted-foreground font-mono">
                unmatched {backfillCounts.unmatched || 0} · pending {backfillCounts.pending ? "YES" : "NO"}
              </div>
            </div>
            <div className="border border-border/60 rounded-sm p-3 bg-secondary/20">
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider font-mono">Last Sync</div>
              <div className="mt-1 text-foreground font-mono">{status?.last_sync_mode || "bootstrap"} / {status?.last_sync_status || "idle"}</div>
              <div className="mt-1 text-muted-foreground font-mono">{status?.last_sync_at || "Never"}</div>
            </div>
          </div>

          {status?.last_error && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-sm p-3 text-[10px] text-destructive">
              <div className="flex items-center gap-2 font-mono uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5" />
                Last Error
              </div>
              <p className="mt-2 font-mono break-words">{status.last_error}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              className="text-[10px] font-mono h-7"
              onClick={() => runAction("sync_snapshot")}
              disabled={Boolean(runningAction)}
            >
              {runningAction === "sync_snapshot" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
              RESEED SNAPSHOT
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] font-mono h-7"
              onClick={() => runAction("sync_live")}
              disabled={Boolean(runningAction)}
            >
              {runningAction === "sync_live" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Radio className="h-3 w-3 mr-1" />}
              LIVE REFRESH
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] font-mono h-7"
              onClick={() => runAction("backfill_references")}
              disabled={Boolean(runningAction)}
            >
              {runningAction === "backfill_references" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Database className="h-3 w-3 mr-1" />}
              RERUN BACKFILL
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-sm p-4 bg-card space-y-4">
          <div>
            <h4 className="text-[10px] font-mono tracking-widest text-muted-foreground">SOURCE MANIFEST & ATTRIBUTION</h4>
            <p className="text-[10px] text-muted-foreground mt-2">
              Live sync is allowlisted to the HumanitZ community sources referenced below. Snapshot reseed uses the checked-in generated catalog from the repository.
            </p>
          </div>

          <div className="space-y-2">
            {sourceManifest.map((source) => (
              <div key={source.id} className="border border-border/60 rounded-sm p-3 bg-secondary/20">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-foreground">{source.label}</span>
                  <Badge variant="outline" className="text-[8px] uppercase">{source.scope}</Badge>
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground">{source.usage}</p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[9px] font-mono text-primary hover:underline break-all"
                >
                  {source.url}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
