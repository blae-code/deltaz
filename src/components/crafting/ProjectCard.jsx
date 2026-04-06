import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Pencil,
  ArrowLeftRight,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MaterialRow from "./MaterialRow";
import TradeFromProject from "./TradeFromProject";

const priorityStyle = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/15 text-primary",
  high: "bg-status-warn/15 text-status-warn",
  urgent: "bg-status-danger/15 text-status-danger",
};

const statusStyle = {
  gathering: "bg-accent/15 text-accent",
  ready: "bg-status-ok/15 text-status-ok",
  completed: "bg-primary/15 text-primary",
  abandoned: "bg-muted text-muted-foreground",
};

export default function ProjectCard({ project, inventory, userEmail, userCallsign }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [materials, setMaterials] = useState(project.materials || []);
  const [showTrade, setShowTrade] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["craftingProjects"] });

  const totalNeeded = materials.length;
  const totalComplete = materials.filter(m => (m.have || 0) >= (m.needed || 1)).length;
  const progress = totalNeeded > 0 ? Math.round((totalComplete / totalNeeded) * 100) : 0;
  const isReady = totalComplete === totalNeeded && totalNeeded > 0;
  const isFinished = project.status === "completed" || project.status === "abandoned";

  const updateMaterial = (idx, field, value) => {
    setMaterials(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const saveMaterials = async () => {
    setSaving(true);
    const newStatus = materials.every(m => (m.have || 0) >= (m.needed || 1)) ? "ready" : "gathering";
    await base44.entities.CraftingProject.update(project.id, {
      materials,
      status: isFinished ? project.status : newStatus,
    });
    setEditing(false);
    setSaving(false);
    toast({ title: "Updated", description: "Material progress saved" });
    invalidate();
  };

  const markComplete = async () => {
    // Optimistic
    queryClient.setQueryData(["craftingProjects", userEmail], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((p) => p.id === project.id ? { ...p, status: "completed", completed_at: new Date().toISOString() } : p);
    });
    try {
      await base44.entities.CraftingProject.update(project.id, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      toast({ title: "Project Completed!", description: `"${project.title}" marked as built` });
    } catch {
      invalidate();
    }
  };

  const abandon = async () => {
    // Optimistic
    queryClient.setQueryData(["craftingProjects", userEmail], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((p) => p.id === project.id ? { ...p, status: "abandoned" } : p);
    });
    try {
      await base44.entities.CraftingProject.update(project.id, { status: "abandoned" });
      toast({ title: "Project Abandoned", description: `"${project.title}" shelved` });
    } catch {
      invalidate();
    }
  };

  const deleteProject = async () => {
    await base44.entities.CraftingProject.delete(project.id);
    toast({ title: "Deleted", description: `"${project.title}" removed` });
    invalidate();
  };

  // Check inventory for auto-detection
  const getInventoryCount = (resourceName) => {
    const lower = resourceName.toLowerCase();
    return inventory
      .filter(i => i.name.toLowerCase().includes(lower))
      .reduce((sum, i) => sum + (i.quantity || 1), 0);
  };

  // Shortfall items for trade
  const shortfalls = materials
    .filter(m => (m.have || 0) < (m.needed || 1))
    .map(m => ({ resource: m.resource, deficit: (m.needed || 1) - (m.have || 0) }));

  return (
    <div className={`border rounded-sm overflow-hidden transition-colors ${
      isReady ? "border-status-ok/40 bg-status-ok/5" :
      isFinished ? "border-border/50 bg-card/50 opacity-70" :
      "border-border bg-card"
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground font-mono truncate">
              {project.title}
            </span>
            <Badge variant="outline" className={`text-[8px] px-1.5 py-0 ${statusStyle[project.status] || ""}`}>
              {project.status?.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={`text-[8px] px-1.5 py-0 ${priorityStyle[project.priority] || ""}`}>
              {project.priority?.toUpperCase()}
            </Badge>
            <span className="text-[9px] text-muted-foreground uppercase">{project.category}</span>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isReady ? "bg-status-ok" : progress > 50 ? "bg-primary" : "bg-accent"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-muted-foreground shrink-0">
              {totalComplete}/{totalNeeded}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-3 py-3 space-y-3">
          {project.description && (
            <p className="text-[10px] text-muted-foreground italic font-mono">{project.description}</p>
          )}

          {/* Material checklist */}
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_60px_60px_50px] gap-1.5 text-[8px] text-muted-foreground/60 uppercase tracking-wider font-mono px-0.5 mb-1">
              <span>Material</span><span>Need</span><span>Have</span><span>Inv.</span>
            </div>
            {materials.map((mat, idx) => (
              <MaterialRow
                key={idx}
                mat={mat}
                idx={idx}
                editing={editing}
                inventoryCount={getInventoryCount(mat.resource)}
                onUpdate={updateMaterial}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
            {!isFinished && (
              <>
                {editing ? (
                  <>
                    <Button size="sm" onClick={saveMaterials} disabled={saving} className="h-6 text-[9px] font-mono uppercase tracking-wider">
                      <Check className="h-3 w-3 mr-0.5" /> {saving ? "SAVING..." : "SAVE"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setMaterials(project.materials || []); setEditing(false); }} className="h-6 text-[9px] font-mono uppercase tracking-wider">
                      <X className="h-3 w-3 mr-0.5" /> CANCEL
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-6 text-[9px] font-mono uppercase tracking-wider">
                    <Pencil className="h-3 w-3 mr-0.5" /> UPDATE QTY
                  </Button>
                )}

                {isReady && (
                  <Button size="sm" variant="default" onClick={markComplete} className="h-6 text-[9px] font-mono uppercase tracking-wider bg-status-ok hover:bg-status-ok/80 text-background">
                    <Check className="h-3 w-3 mr-0.5" /> MARK BUILT
                  </Button>
                )}

                {shortfalls.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTrade(!showTrade)}
                    className="h-6 text-[9px] font-mono uppercase tracking-wider border-accent/40 text-accent hover:bg-accent/10"
                  >
                    <ShoppingCart className="h-3 w-3 mr-0.5" /> SOURCE ({shortfalls.length})
                  </Button>
                )}

                <Button size="sm" variant="ghost" onClick={abandon} className="h-6 text-[9px] font-mono uppercase tracking-wider text-muted-foreground hover:text-status-warn ml-auto">
                  SHELVE
                </Button>
              </>
            )}

            {isFinished && (
              <Button size="sm" variant="ghost" onClick={deleteProject} className="h-6 text-[9px] font-mono uppercase tracking-wider text-destructive/60 hover:text-destructive">
                <Trash2 className="h-3 w-3 mr-0.5" /> DELETE
              </Button>
            )}
          </div>

          {/* Trade shortfalls */}
          {showTrade && !isFinished && shortfalls.length > 0 && (
            <TradeFromProject
              shortfalls={shortfalls}
              projectTitle={project.title}
              userEmail={userEmail}
              userCallsign={userCallsign}
              onDone={() => setShowTrade(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}