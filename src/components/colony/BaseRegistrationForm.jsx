import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BaseRegistrationForm({ userEmail, territories, onCreated }) {
  const [name, setName] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [gridX, setGridX] = useState("");
  const [gridY, setGridY] = useState("");
  const [sector, setSector] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await base44.entities.PlayerBase.create({
      owner_email: userEmail,
      name: name.trim(),
      territory_id: territoryId || undefined,
      grid_x: gridX ? parseFloat(gridX) : undefined,
      grid_y: gridY ? parseFloat(gridY) : undefined,
      sector: sector.trim() || undefined,
      defense_level: 1,
      capacity: 5,
      status: "active",
    });
    toast({ title: `Base "${name}" established` });
    setName(""); setTerritoryId(""); setGridX(""); setGridY(""); setSector("");
    setSaving(false);
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Home className="h-4 w-4 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
          Establish New Base
        </span>
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Base Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Outpost Sigma" className="h-8 text-xs bg-secondary/50 border-border font-mono mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Link Territory</Label>
          <Select value={territoryId} onValueChange={setTerritoryId}>
            <SelectTrigger className="h-8 text-[10px] bg-secondary/50 border-border font-mono mt-1">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {territories.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name} ({t.sector})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Sector Code</Label>
          <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. C-3" className="h-8 text-xs bg-secondary/50 border-border font-mono mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Grid X (0-100)</Label>
          <Input type="number" min="0" max="100" value={gridX} onChange={(e) => setGridX(e.target.value)} className="h-8 text-xs bg-secondary/50 border-border font-mono mt-1" />
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Grid Y (0-100)</Label>
          <Input type="number" min="0" max="100" value={gridY} onChange={(e) => setGridY(e.target.value)} className="h-8 text-xs bg-secondary/50 border-border font-mono mt-1" />
        </div>
      </div>

      <Button type="submit" disabled={saving} size="sm" className="font-mono text-xs uppercase tracking-wider w-full">
        <MapPin className="h-3 w-3 mr-1" /> {saving ? "ESTABLISHING..." : "ESTABLISH BASE"}
      </Button>
    </form>
  );
}