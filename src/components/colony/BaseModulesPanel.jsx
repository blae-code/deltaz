import { useState } from "react";
import { base44 } from "@/api/base44Client";
import useEntityQuery from "../../hooks/useEntityQuery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Hammer, Shield, Heart, Leaf, Radio, Wrench, Eye, Package, Sun, Swords,
  Plus, ArrowUp, Loader2, AlertTriangle
} from "lucide-react";

const MODULE_ICONS = {
  crafting_station: Hammer,
  medical_bay: Heart,
  defensive_turret: Shield,
  hydroponics: Leaf,
  armory: Swords,
  comms_tower: Radio,
  workshop: Wrench,
  watchtower: Eye,
  storage_vault: Package,
  solar_array: Sun,
};

const MODULE_LABELS = {
  crafting_station: "Crafting Station",
  medical_bay: "Medical Bay",
  defensive_turret: "Defensive Turret",
  hydroponics: "Hydroponics Bay",
  armory: "Armory",
  comms_tower: "Comms Tower",
  workshop: "Workshop",
  watchtower: "Watchtower",
  storage_vault: "Storage Vault",
  solar_array: "Solar Array",
};

const STATUS_STYLE = {
  active: "text-status-ok",
  constructing: "text-accent",
  damaged: "text-destructive",
  destroyed: "text-muted-foreground",
};

export default function BaseModulesPanel({ baseId, baseName }) {
  const [building, setBuilding] = useState(false);
  const [upgrading, setUpgrading] = useState(null);
  const [showBuild, setShowBuild] = useState(false);

  const { data: modules = [], refetch } = useEntityQuery(
    ["base-modules", baseId],
    () => base44.entities.BaseModule.filter({ base_id: baseId }),
    { subscribeEntities: ["BaseModule"], queryOpts: { enabled: !!baseId } }
  );

  const activeModules = modules.filter(m => m.status !== "destroyed");
  const builtTypes = modules.map(m => m.module_type);
  const availableTypes = Object.keys(MODULE_LABELS).filter(t => !builtTypes.includes(t));

  const handleConstruct = async (moduleType) => {
    setBuilding(true);
    const res = await base44.functions.invoke("baseModules", {
      action: "construct",
      base_id: baseId,
      module_type: moduleType,
    });
    if (res.data?.error) {
      toast({ title: "Build failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: `${MODULE_LABELS[moduleType]} constructed!` });
      setShowBuild(false);
      refetch();
    }
    setBuilding(false);
  };

  const handleUpgrade = async (moduleId) => {
    setUpgrading(moduleId);
    const res = await base44.functions.invoke("baseModules", {
      action: "upgrade",
      module_id: moduleId,
    });
    if (res.data?.error) {
      toast({ title: "Upgrade failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: `Upgraded to Level ${res.data.new_level}! (+${res.data.new_bonus}%)` });
      refetch();
    }
    setUpgrading(null);
  };

  const handleRepair = async (moduleId) => {
    setUpgrading(moduleId);
    const res = await base44.functions.invoke("baseModules", {
      action: "repair",
      module_id: moduleId,
    });
    if (res.data?.error) {
      toast({ title: "Repair failed", description: res.data.error, variant: "destructive" });
    } else {
      toast({ title: "Module repaired!" });
      refetch();
    }
    setUpgrading(null);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
          {activeModules.length} modules built
        </span>
        {availableTypes.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-[9px] uppercase tracking-wider h-6 gap-1"
            onClick={() => setShowBuild(!showBuild)}
          >
            <Plus className="h-2.5 w-2.5" />
            {showBuild ? "Cancel" : "Build Module"}
          </Button>
        )}
      </div>

      {/* Build selector */}
      {showBuild && (
        <div className="border border-dashed border-primary/30 bg-primary/5 rounded-sm p-3 space-y-2">
          <p className="text-[10px] text-primary font-mono tracking-wider uppercase">Available Modules</p>
          <div className="grid grid-cols-2 gap-1.5">
            {availableTypes.map(type => {
              const Icon = MODULE_ICONS[type] || Package;
              return (
                <button
                  key={type}
                  disabled={building}
                  onClick={() => handleConstruct(type)}
                  className="flex items-center gap-2 border border-border bg-card hover:border-primary/40 hover:bg-primary/5 rounded-sm px-2.5 py-2 transition-all text-left"
                >
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-semibold text-foreground truncate">{MODULE_LABELS[type]}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {building && (
            <div className="flex items-center gap-2 text-[9px] text-accent">
              <Loader2 className="h-3 w-3 animate-spin" /> Constructing...
            </div>
          )}
        </div>
      )}

      {/* Module grid */}
      {activeModules.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-border rounded-sm">
          <Package className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">No modules built yet. Construct modules to unlock bonuses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeModules.map(mod => {
            const Icon = MODULE_ICONS[mod.module_type] || Package;
            const isMax = mod.level >= 5;
            const isDamaged = mod.status === "damaged";

            return (
              <div
                key={mod.id}
                className={`border rounded-sm p-3 space-y-2 ${
                  isDamaged ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${STATUS_STYLE[mod.status] || "text-primary"}`} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono font-bold text-foreground truncate">
                        {MODULE_LABELS[mod.module_type] || mod.module_type}
                      </div>
                      <div className="text-[8px] text-muted-foreground">Lv {mod.level}/5</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[7px] uppercase ${STATUS_STYLE[mod.status]}`}>
                    {mod.status}
                  </Badge>
                </div>

                {/* Level bar */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${i < mod.level ? "bg-primary" : "bg-secondary"}`}
                    />
                  ))}
                </div>

                {/* Bonus */}
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-primary font-mono">
                    +{mod.bonus_value}% {(mod.bonus_type || "").replace(/_/g, " ")}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {isDamaged ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[8px] uppercase tracking-wider h-6 gap-1 flex-1"
                      onClick={() => handleRepair(mod.id)}
                      disabled={upgrading === mod.id}
                    >
                      {upgrading === mod.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Wrench className="h-2.5 w-2.5" />}
                      Repair
                    </Button>
                  ) : !isMax ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[8px] uppercase tracking-wider h-6 gap-1 flex-1"
                      onClick={() => handleUpgrade(mod.id)}
                      disabled={upgrading === mod.id}
                    >
                      {upgrading === mod.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <ArrowUp className="h-2.5 w-2.5" />}
                      Upgrade to Lv {mod.level + 1}
                    </Button>
                  ) : (
                    <span className="text-[8px] text-status-ok font-mono">MAX LEVEL</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}