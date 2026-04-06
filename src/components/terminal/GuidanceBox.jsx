import { Info } from "lucide-react";

export default function GuidanceBox({ icon: Icon = Info, title, children, color = "primary" }) {
  const colorMap = {
    primary: "border-primary/20 bg-primary/5 text-primary",
    accent: "border-accent/20 bg-accent/5 text-accent",
    muted: "border-border bg-secondary/30 text-muted-foreground",
  };

  const cls = colorMap[color] || colorMap.primary;

  return (
    <div className={`flex items-start gap-2.5 rounded-sm p-3 border ${cls}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        {title && (
          <p className="text-[11px] font-semibold tracking-wider uppercase">{title}</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}