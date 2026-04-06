import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Sword, Wrench, Apple, Box, Zap, Trash2, Hammer, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DismantleDialog from "./DismantleDialog";
import TransferDialog from "./TransferDialog";

const catIcons = { weapon: Sword, armor: Shield, tool: Wrench, consumable: Apple, material: Box, ammo: Zap, misc: Box };

const rarityColors = {
  common: "text-muted-foreground border-border",
  uncommon: "text-status-ok border-status-ok/30",
  rare: "text-status-info border-status-info/30",
  epic: "text-purple-400 border-purple-400/30",
  legendary: "text-accent border-accent/30",
};

export default function InventoryItemCard({ item, onUpdate, userEmail }) {
  const [loading, setLoading] = useState(false);
  const [showDismantle, setShowDismantle] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const { toast } = useToast();
  const Icon = catIcons[item.category] || Box;

  const toggleEquip = async () => {
    setLoading(true);
    await base44.entities.InventoryItem.update(item.id, { is_equipped: !item.is_equipped });
    toast({ title: item.is_equipped ? "Unequipped" : "Equipped", description: item.name });
    onUpdate?.();
    setLoading(false);
  };

  const deleteItem = async () => {
    setLoading(true);
    await base44.entities.InventoryItem.delete(item.id);
    toast({ title: "Discarded", description: item.name });
    onUpdate?.();
  };

  const condColor = (item.condition ?? 100) < 25 ? "text-status-danger" : (item.condition ?? 100) < 50 ? "text-accent" : "text-primary";

  return (
    <div className={`border rounded-sm p-2.5 bg-card ${item.is_equipped ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded-sm border ${rarityColors[item.rarity] || rarityColors.common}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
            {item.quantity > 1 && <span className="text-[9px] text-muted-foreground">x{item.quantity}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="outline" className={`text-[8px] uppercase ${rarityColors[item.rarity] || ""}`}>
              {item.rarity}
            </Badge>
            {item.is_equipped && <Badge className="text-[8px] bg-primary/20 text-primary border-0">EQUIPPED</Badge>}
            {item.value > 0 && <span className="text-[9px] text-accent">{item.value}c</span>}
          </div>
        </div>
      </div>

      {/* Condition bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${item.condition ?? 100}%` }} />
        </div>
        <span className={`text-[8px] font-mono ${condColor}`}>{item.condition ?? 100}%</span>
      </div>

      {/* Actions */}
      <div className="flex gap-1 mt-2">
        <Button variant="outline" size="sm" className="flex-1 h-6 text-[9px] uppercase tracking-wider" onClick={toggleEquip} disabled={loading}>
          {item.is_equipped ? "UNEQUIP" : "EQUIP"}
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-accent/70 border-accent/20 hover:text-accent" onClick={() => setShowDismantle(!showDismantle)} disabled={loading} title="Dismantle">
          <Hammer className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-primary/70 border-primary/20 hover:text-primary" onClick={() => setShowTransfer(!showTransfer)} disabled={loading} title="Transfer">
          <ArrowRight className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-destructive border-destructive/20" onClick={deleteItem} disabled={loading}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {showDismantle && (
        <DismantleDialog item={item} userEmail={userEmail} onComplete={() => { setShowDismantle(false); onUpdate?.(); }} onCancel={() => setShowDismantle(false)} />
      )}

      {showTransfer && (
        <TransferDialog item={item} userEmail={userEmail} onComplete={() => { setShowTransfer(false); onUpdate?.(); }} onCancel={() => setShowTransfer(false)} />
      )}

      {item.source && <p className="text-[8px] text-muted-foreground mt-1.5 italic">Source: {item.source}</p>}
    </div>
  );
}