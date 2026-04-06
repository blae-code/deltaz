import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import WIDGET_REGISTRY, { DEFAULT_LAYOUT } from "../components/dashboard/WidgetRegistry";
import WidgetWrapper from "../components/dashboard/WidgetWrapper";
import DashboardCustomizer from "../components/dashboard/DashboardCustomizer";
import NotificationBanner from "../components/dashboard/NotificationBanner";
import WorldPulseStatus from "../components/dashboard/WorldPulseStatus";
import LiveEventWatcher from "../components/dashboard/LiveEventWatcher";
import StatCard from "../components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crosshair, Shield, Map, Settings, GripVertical } from "lucide-react";
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Job.list("-created_date", 5),
      base44.entities.Event.list("-created_date", 5),
      base44.entities.Faction.list("-created_date", 10),
      base44.entities.Territory.list("-created_date", 10),
      base44.auth.me(),
    ])
      .then(([j, e, f, t, u]) => {
        setJobs(j);
        setEvents(e);
        setFactions(f);
        setTerritories(t);
        setUser(u);
        // Load persisted layout
        const saved = u?.dashboard_layout;
        if (saved && Array.isArray(saved)) {
          // Merge with registry in case new widgets were added
          const merged = mergeLayout(saved);
          setLayout(merged);
        } else {
          setLayout(DEFAULT_LAYOUT);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Merge saved layout with current registry — keeps new widgets, removes stale
  const mergeLayout = (saved) => {
    const savedMap = new Map(saved.map((s) => [s.id, s]));
    const merged = [];
    // Keep saved order for existing widgets
    saved.forEach((s) => {
      if (WIDGET_REGISTRY.find((w) => w.id === s.id)) {
        merged.push(s);
      }
    });
    // Add any new widgets not in saved
    WIDGET_REGISTRY.forEach((w) => {
      if (!savedMap.has(w.id)) {
        merged.push({ id: w.id, visible: true, size: w.defaultSize });
      }
    });
    return merged;
  };

  const saveLayout = useCallback(async (newLayout) => {
    setLayout(newLayout);
    await base44.auth.updateMe({ dashboard_layout: newLayout });
  }, []);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newLayout = [...layout];
    const [moved] = newLayout.splice(result.source.index, 1);
    newLayout.splice(result.destination.index, 0, moved);
    saveLayout(newLayout);
  };

  const handleResize = (id, newSize) => {
    const newLayout = layout.map((w) =>
      w.id === id ? { ...w, size: newSize } : w
    );
    saveLayout(newLayout);
  };

  if (loading || !layout) {
    return <DashboardSkeleton />;
  }

  const visibleWidgets = layout.filter((w) => w.visible);

  const stats = [
    {
      label: "ACTIVE MISSIONS",
      value: jobs.filter((j) => j.status === "available" || j.status === "in_progress").length,
      icon: Crosshair,
      color: "text-primary",
      description: "Missions currently available or being executed by operatives",
      detail: `${jobs.filter(j => j.status === "available").length} available · ${jobs.filter(j => j.status === "in_progress").length} in progress`,
    },
    {
      label: "ACTIVE EVENTS",
      value: events.filter((e) => e.is_active).length,
      icon: AlertTriangle,
      color: "text-accent",
      description: "World events, broadcasts, and anomalies currently affecting the AO",
      detail: events.length > 0 ? `Latest: ${events[0]?.title?.substring(0, 30)}...` : "No recent events",
    },
    {
      label: "CLANS",
      value: factions.length,
      icon: Shield,
      color: "text-primary",
      description: "Registered factions operating across all sectors",
      detail: `${factions.filter(f => f.status === "active").length} active · ${factions.filter(f => f.status === "hostile").length} hostile`,
    },
    {
      label: "TERRITORIES",
      value: territories.length,
      icon: Map,
      color: "text-accent",
      description: "Mapped zones across the 5×5 tactical grid",
      detail: `${territories.filter(t => t.status === "contested").length} contested · ${territories.filter(t => t.status === "hostile").length} hostile`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
            Situation Report
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Operational overview — all sectors
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            className="h-7 text-[9px] tracking-wider"
            onClick={() => setIsEditing(!isEditing)}
          >
            <GripVertical className="h-3 w-3 mr-1" />
            {isEditing ? "DONE" : "REORDER"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[9px] tracking-wider"
            onClick={() => setShowCustomizer(!showCustomizer)}
          >
            <Settings className="h-3 w-3 mr-1" />
            CUSTOMIZE
          </Button>
        </div>
      </div>

      {/* Real-time event watcher */}
      {user?.email && <LiveEventWatcher userEmail={user.email} />}

      {/* Customizer panel */}
      {showCustomizer && (
        <DashboardCustomizer
          layout={layout}
          onSave={saveLayout}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {/* Notifications */}
      {user?.email && <NotificationBanner userEmail={user.email} />}

      {/* Widget grid with drag and drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {visibleWidgets.map((item, index) => {
                const reg = WIDGET_REGISTRY.find((w) => w.id === item.id);
                if (!reg) return null;

                // Built-in widgets that aren't standalone components
                if (item.id === "stats") {
                  return (
                    <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!isEditing}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className="col-span-full"
                        >
                          <WidgetWrapper
                            widget={reg}
                            size={item.size}
                            sizes={reg.sizes}
                            onResize={(s) => handleResize(item.id, s)}
                            isEditing={isEditing}
                            dragHandleProps={dragProvided.dragHandleProps}
                          >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {stats.map((stat) => (
                                <StatCard key={stat.label} {...stat} />
                              ))}
                            </div>
                          </WidgetWrapper>
                        </div>
                      )}
                    </Draggable>
                  );
                }

                if (item.id === "world_pulse") {
                  return (
                    <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!isEditing}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className="col-span-full"
                        >
                          <WidgetWrapper
                            widget={reg}
                            size={item.size}
                            sizes={reg.sizes}
                            onResize={(s) => handleResize(item.id, s)}
                            isEditing={isEditing}
                            dragHandleProps={dragProvided.dragHandleProps}
                          >
                            <WorldPulseStatus isAdmin={user?.role === "admin"} />
                          </WidgetWrapper>
                        </div>
                      )}
                    </Draggable>
                  );
                }

                // Dynamic component widgets
                const Component = reg.component;
                if (!Component) return null;

                const widgetProps = {};
                if (item.id === "colony_monitor") {
                  widgetProps.isAdmin = user?.role === "admin" || user?.role === "game_master";
                }

                const spanClass = item.size === "full" ? "col-span-full" : item.size === "lg" ? "md:col-span-2" : "col-span-1";

                return (
                  <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!isEditing}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={spanClass}
                      >
                        <WidgetWrapper
                          widget={reg}
                          size={item.size}
                          sizes={reg.sizes}
                          onResize={(s) => handleResize(item.id, s)}
                          isEditing={isEditing}
                          dragHandleProps={dragProvided.dragHandleProps}
                        >
                          <Component {...widgetProps} />
                        </WidgetWrapper>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}