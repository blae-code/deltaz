import { useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../../hooks/useEntityQuery";
import DramaCard from "./DramaCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Sparkles, Theater, Filter } from "lucide-react";

export default function SurvivorDramaPanel() {
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState("active");

  const dramaQuery = useEntityQuery(
    "admin-dramas",
    () => base44.entities.SurvivorDrama.list("-created_date", 50),
    { subscribeEntities: ["SurvivorDrama"] }
  );
  const { data: dramas = [] } = dramaQuery;

  const handleGenerate = async (force = false) => {
    setGenerating(true);
    const res = await base44.functions.invoke("survivorDramaEngine", { force });
    if (res.data?.error) {
      toast({ title: "Generation failed", description: res.data.error, variant: "destructive" });
    } else if (res.data?.status === "skipped") {
      toast({ title: "No drama generated", description: res.data.reason });
    } else {
      toast({ title: "Survivor drama generated!", description: `${res.data.drama_type} (${res.data.severity})` });
      dramaQuery.refetch();
    }
    setGenerating(false);
  };

  const filters = ["active", "resolved", "all"];
  const filtered = filter === "all" ? dramas : dramas.filter(d => d.status === filter);
  const activeCount = dramas.filter(d => d.status === "active").length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Theater className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-bold font-display text-foreground uppercase tracking-wider">
            Survivor Drama
          </h3>
          {activeCount > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent border border-accent/20">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7 gap-1"
            onClick={() => handleGenerate(false)}
            disabled={generating}
          >
            <Sparkles className="h-3 w-3" />
            {generating ? "Rolling..." : "Roll Drama"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7 gap-1"
            onClick={() => handleGenerate(true)}
            disabled={generating}
          >
            Force Generate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3 w-3 text-muted-foreground" />
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${
              filter === f
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/30 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f} {f === "active" && activeCount > 0 ? `(${activeCount})` : ""}
          </button>
        ))}
      </div>

      {/* Drama cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-sm">
          <Theater className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">
            {filter === "active"
              ? "No active dramas. Colony is peaceful... for now."
              : "No drama events match this filter."}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Click "Roll Drama" to check if morale triggers a scenario.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <DramaCard key={d.id} drama={d} onResolved={() => dramaQuery.refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}