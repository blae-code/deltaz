import AdminSectionHeader from "./AdminSectionHeader";
import AdminTabButton from "./AdminTabButton";

/**
 * AdminSubSection — shared shell for all admin sub-panels.
 * Replaces the duplicated pattern across AdminLiveOps, AdminEconomy,
 * AdminWorldMgmt, and AdminServerPanel:
 *   1. Section header
 *   2. Tab row
 *   3. Active tab description (with optional risk styling)
 *   4. Card-wrapped content
 *
 * Props:
 *  - title, description, icon, riskLevel → forwarded to AdminSectionHeader
 *  - tabs: [{ key, label, icon, description?, risk? }]
 *  - activeTab: current key
 *  - onTabChange: (key) => void
 *  - children: rendered inside the card wrapper
 */
export default function AdminSubSection({
  title, description, icon, riskLevel,
  tabs, activeTab, onTabChange,
  children,
}) {
  const active = tabs.find(t => t.key === activeTab);

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        icon={icon}
        title={title}
        description={description}
        riskLevel={riskLevel}
      />

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(t => (
          <AdminTabButton
            key={t.key}
            icon={t.icon}
            label={t.label}
            active={activeTab === t.key}
            onClick={() => onTabChange(t.key)}
            risk={t.risk}
          />
        ))}
      </div>

      {active?.description && (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-sm border text-[9px] font-mono leading-snug ${
          active.risk === "high"
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "border-border bg-secondary/30 text-muted-foreground"
        }`}>
          {active.risk === "high" && (
            <span className="shrink-0 mt-0.5">⚠</span>
          )}
          <span>{active.description}</span>
        </div>
      )}

      <div className="border border-border bg-card rounded-sm p-4">
        {children}
      </div>
    </div>
  );
}