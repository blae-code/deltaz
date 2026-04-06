import { base44 } from "@/api/base44Client";
import useEntityQuery from "../../hooks/useEntityQuery";
import { Wheat, Droplets, Heart, Zap, Shield, Smile, TrendingUp, TrendingDown, Minus } from "lucide-react";
import moment from "moment";

const RESOURCE_META = {
  food_reserves:      { icon: Wheat,    label: "Food",    color: "text-primary" },
  water_supply:       { icon: Droplets, label: "Water",   color: "text-blue-400" },
  medical_supplies:   { icon: Heart,    label: "Medical", color: "text-red-400" },
  power_level:        { icon: Zap,      label: "Power",   color: "text-yellow-400" },
  defense_integrity:  { icon: Shield,   label: "Defense", color: "text-accent" },
  morale:             { icon: Smile,    label: "Morale",  color: "text-primary" },
};

export default function ResourceHistoryFeed({ colonyId }) {
  const { data: history = [], isLoading } = useEntityQuery(
    ["resource-history", colonyId],
    () => colonyId
      ? base44.entities.ResourceHistory.filter({ colony_id: colonyId }, "-created_date", 50)
      : Promise.resolve([]),
    { subscribeEntities: ["ResourceHistory"], queryOpts: { enabled: !!colonyId } }
  );

  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <p className="text-[10px] text-muted-foreground animate-pulse font-mono tracking-wider">
          LOADING RESOURCE LOG...
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-[10px] text-muted-foreground/60 italic">
          No resource changes recorded yet. Changes will appear here as colony metrics are updated.
        </p>
      </div>
    );
  }

  // Group by date
  const grouped = {};
  history.forEach(entry => {
    const day = moment(entry.created_date).format("YYYY-MM-DD");
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(entry);
  });

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {Object.entries(grouped).map(([day, entries]) => (
        <div key={day}>
          <div className="text-[8px] text-muted-foreground tracking-widest uppercase font-mono mb-1.5 sticky top-0 bg-card py-0.5">
            {moment(day).calendar(null, {
              sameDay: "[TODAY]",
              lastDay: "[YESTERDAY]",
              lastWeek: "dddd",
              sameElse: "MMM D",
            })}
          </div>
          <div className="space-y-1">
            {entries.map(entry => (
              <ResourceHistoryEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceHistoryEntry({ entry }) {
  const meta = RESOURCE_META[entry.resource] || { icon: Minus, label: entry.resource, color: "text-muted-foreground" };
  const Icon = meta.icon;
  const isIncrease = entry.delta > 0;
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;
  const deltaColor = isIncrease ? "text-status-ok" : "text-status-danger";
  const deltaSign = isIncrease ? "+" : "";

  return (
    <div className="flex items-center gap-2.5 border border-border/50 rounded-sm px-3 py-2 hover:bg-secondary/20 transition-colors">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-foreground">{meta.label}</span>
          <TrendIcon className={`h-3 w-3 ${deltaColor}`} />
          <span className={`text-[10px] font-mono font-bold ${deltaColor}`}>
            {deltaSign}{entry.delta}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
          <span>{entry.old_value} → {entry.new_value}</span>
          <span>·</span>
          <span>{moment(entry.created_date).format("HH:mm")}</span>
          {entry.changed_by && (
            <>
              <span>·</span>
              <span className="truncate">{entry.changed_by}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}