import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function TransferDialog({ item, userEmail, onComplete, onCancel }) {
  const [users, setUsers] = useState([]);
  const [targetEmail, setTargetEmail] = useState("");
  const [qty, setQty] = useState(1);
  const [transferring, setTransferring] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.User.list("-created_date", 100).then(us => {
      setUsers(us.filter(u => u.email !== userEmail));
    });
  }, [userEmail]);

  const handleTransfer = async () => {
    if (!targetEmail) return;
    setTransferring(true);

    const transferQty = Math.min(qty, item.quantity || 1);

    // Create item for recipient
    await base44.entities.InventoryItem.create({
      owner_email: targetEmail,
      name: item.name,
      category: item.category,
      quantity: transferQty,
      rarity: item.rarity,
      condition: item.condition,
      value: item.value,
      source: `Transfer from ${userEmail}`,
      sector: item.sector,
    });

    // Update or delete sender's item
    const remaining = (item.quantity || 1) - transferQty;
    if (remaining <= 0) {
      await base44.entities.InventoryItem.delete(item.id);
    } else {
      await base44.entities.InventoryItem.update(item.id, { quantity: remaining });
    }

    const targetUser = users.find(u => u.email === targetEmail);
    toast({
      title: "Transfer Complete",
      description: `${transferQty}x ${item.name} sent to ${targetUser?.callsign || targetEmail}`,
    });

    setDone(true);
    setTransferring(false);
    setTimeout(() => onComplete?.(), 1000);
  };

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-sm p-3 space-y-3">
      <div className="flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold font-display tracking-wider text-primary uppercase">
          Transfer: {item.name}
        </span>
      </div>

      {done ? (
        <div className="flex items-center gap-2 text-status-ok text-[10px] font-mono">
          <Check className="h-3.5 w-3.5" /> Transfer complete
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">RECIPIENT</label>
            <Select value={targetEmail} onValueChange={setTargetEmail}>
              <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono">
                <SelectValue placeholder="Select operative..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {u.callsign || u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(item.quantity || 1) > 1 && (
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                QUANTITY (max: {item.quantity || 1})
              </label>
              <Input
                type="number"
                min={1}
                max={item.quantity || 1}
                value={qty}
                onChange={e => setQty(Math.max(1, Math.min(item.quantity || 1, parseInt(e.target.value) || 1)))}
                className="h-7 text-[10px] bg-secondary/50 border-border font-mono w-24"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase tracking-wider" onClick={onCancel}>
              CANCEL
            </Button>
            <Button
              size="sm"
              className="h-7 text-[10px] uppercase tracking-wider"
              onClick={handleTransfer}
              disabled={!targetEmail || transferring}
            >
              {transferring ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowRight className="h-3 w-3 mr-1" />}
              TRANSFER
            </Button>
          </div>
        </>
      )}
    </div>
  );
}