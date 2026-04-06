import { useState } from "react";
import { Plus, Camera, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddItemForm from "./AddItemForm";
import BulkAddForm from "./BulkAddForm";
import ScreenshotIngestion from "./ScreenshotIngestion";

const TABS = [
  { key: "single", label: "ADD ITEM", icon: Plus },
  { key: "bulk", label: "BULK ADD", icon: List },
  { key: "scan", label: "SCAN", icon: Camera },
];

export default function AddGearDrawer({ userEmail, onClose }) {
  const [tab, setTab] = useState("single");

  return (
    <div className="border border-primary/30 bg-card rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/30">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[9px] font-mono uppercase tracking-wider transition-colors ${
                tab === t.key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {tab === "single" && <AddItemForm userEmail={userEmail} onAdded={onClose} />}
        {tab === "bulk" && <BulkAddForm userEmail={userEmail} onComplete={onClose} />}
        {tab === "scan" && <ScreenshotIngestion userEmail={userEmail} onComplete={onClose} />}
      </div>
    </div>
  );
}