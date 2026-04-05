import { GripVertical, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeToColSpan = {
  sm: "col-span-1",
  md: "col-span-1",
  lg: "col-span-2",
  full: "col-span-full",
};

export default function WidgetWrapper({
  widget,
  size,
  sizes,
  onResize,
  isEditing,
  dragHandleProps,
  children,
}) {
  const currentIdx = sizes.indexOf(size);
  const canGrow = currentIdx < sizes.length - 1;
  const canShrink = currentIdx > 0;

  const grow = () => {
    if (canGrow) onResize(sizes[currentIdx + 1]);
  };
  const shrink = () => {
    if (canShrink) onResize(sizes[currentIdx - 1]);
  };

  return (
    <div
      className={cn(
        "relative group",
        sizeToColSpan[size] || "col-span-1",
        isEditing && "ring-1 ring-primary/20 rounded-sm"
      )}
    >
      {isEditing && (
        <div className="absolute -top-0 left-0 right-0 z-20 flex items-center justify-between bg-primary/10 border-b border-primary/20 px-2 py-1 rounded-t-sm">
          <div className="flex items-center gap-1.5" {...dragHandleProps}>
            <GripVertical className="h-3 w-3 text-primary cursor-grab active:cursor-grabbing" />
            <span className="text-[9px] text-primary font-mono tracking-wider">
              {widget.label.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {canShrink && (
              <button onClick={shrink} className="p-0.5 text-primary/60 hover:text-primary" title="Smaller">
                <Minimize2 className="h-3 w-3" />
              </button>
            )}
            {canGrow && (
              <button onClick={grow} className="p-0.5 text-primary/60 hover:text-primary" title="Larger">
                <Maximize2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className={cn(isEditing && "mt-6")}>
        {children}
      </div>
    </div>
  );
}