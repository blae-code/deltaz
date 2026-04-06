import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ConfirmDialog from "./ConfirmDialog";

export default function SurvivorAdminPanel() {
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState("");
  const [count, setCount] = useState(1);
  const [assigning, setAssigning] = useState(false);
  const [cycling, setCycling] = useState(false);
  const [confirmCycle, setConfirmCycle] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.PlayerBase.filter({ status: "active" }).then(setBases);
  }, []);

  const handleAssign = async () => {
    if (!selectedBase) return;
    setAssigning(true);
    const res = await base44.functions.invoke("survivorEngine", { mode: "assign", base_id: selectedBase, count: parseInt(count) || 1 });
    toast({ title: `${res.data.generated || 0} survivor(s) assigned` });
    setAssigning(false);
  };

  const handleCycle = async () => {
    setCycling(true);
    const res = await base44.functions.invoke("survivorEngine", { mode: "cycle" });
    const totalNew = (res.data.arrivals || []).reduce((s, a) => s + a.new_survivors, 0);
    toast({ title: `Cycle complete: ${totalNew} new arrival(s) across ${res.data.bases_processed} bases` });
    setCycling(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-muted-foreground">
        Manage the survivor colony system. Run a cycle to automatically attract survivors based on reputation, world events, and base conditions — or manually assign survivors to specific bases.
      </p>

      {/* Auto Cycle */}
      <div className="border border-border rounded-sm p-3 space-y-2">
        <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Auto Cycle</div>
        <p className="text-[9px] text-muted-foreground">
          Evaluates all active bases and spawns survivors based on reputation, territory safety, wars, and events.
        </p>
        <Button size="sm" onClick={() => setConfirmCycle(true)} disabled={cycling} className="text-[10px] font-mono h-7">
          {cycling ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
          {cycling ? "RUNNING..." : "RUN SURVIVOR CYCLE"}
        </Button>

        <ConfirmDialog
          open={confirmCycle}
          onOpenChange={setConfirmCycle}
          title="RUN SURVIVOR CYCLE"
          description="This will evaluate all active bases and spawn new survivors based on reputation, territory safety, active wars, and world events."
          impact="New NPC survivors will appear at player bases. Colony stats, food consumption, and defense ratings will change."
          severity="warning"
          confirmLabel="RUN CYCLE"
          onConfirm={() => { setConfirmCycle(false); handleCycle(); }}
        />
      </div>

      {/* Manual Assign */}
      <div className="border border-border rounded-sm p-3 space-y-3">
        <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Manual Assignment</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[9px] tracking-wider">TARGET BASE</Label>
            <Select value={selectedBase} onValueChange={setSelectedBase}>
              <SelectTrigger className="h-7 text-[10px] bg-secondary/50 font-mono mt-1">
                <SelectValue placeholder="Select base..." />
              </SelectTrigger>
              <SelectContent>
                {bases.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name} ({b.owner_email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[9px] tracking-wider">COUNT</Label>
            <Input type="number" min="1" max="5" value={count} onChange={(e) => setCount(e.target.value)} className="h-7 text-[10px] bg-secondary/50 font-mono mt-1" />
          </div>
        </div>
        <Button size="sm" onClick={handleAssign} disabled={assigning || !selectedBase} className="text-[10px] font-mono h-7">
          {assigning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Users className="h-3 w-3 mr-1" />}
          {assigning ? "GENERATING..." : "ASSIGN SURVIVORS"}
        </Button>
      </div>
    </div>
  );
}