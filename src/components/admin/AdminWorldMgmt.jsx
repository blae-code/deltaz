import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flag, Shield, Plus, Megaphone, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TerritoryOpsPanel from "./TerritoryOpsPanel";
import DiplomacyPanel from "./DiplomacyPanel";

function CreateFactionForm({ onCreated }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#22c55e");
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await base44.entities.Faction.create({ name, code, description, color, status: "active" });
    toast({ title: "Faction created" });
    setName(""); setCode(""); setDescription("");
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[10px] font-mono">NAME</Label><Input value={name} onChange={e => setName(e.target.value)} required className="h-8 font-mono text-xs bg-muted" /></div>
        <div><Label className="text-[10px] font-mono">CODE</Label><Input value={code} onChange={e => setCode(e.target.value)} required maxLength={5} className="h-8 font-mono text-xs bg-muted" /></div>
      </div>
      <div><Label className="text-[10px] font-mono">DESCRIPTION</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="font-mono text-xs bg-muted" rows={2} /></div>
      <div><Label className="text-[10px] font-mono">COLOR</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-20" /></div>
      <Button type="submit" size="sm" className="font-mono text-xs"><Plus className="w-3 h-3 mr-1" />CREATE FACTION</Button>
    </form>
  );
}

function CreateTerritoryForm({ onCreated }) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [threatLevel, setThreatLevel] = useState("green");
  const [status, setStatus] = useState("stable");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await base44.entities.Territory.create({ name, sector, threat_level: threatLevel, status, notes });
    toast({ title: "Territory added" });
    setName(""); setSector(""); setNotes("");
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[10px] font-mono">NAME</Label><Input value={name} onChange={e => setName(e.target.value)} required className="h-8 font-mono text-xs bg-muted" /></div>
        <div><Label className="text-[10px] font-mono">SECTOR</Label><Input value={sector} onChange={e => setSector(e.target.value)} required className="h-8 font-mono text-xs bg-muted" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono">THREAT</Label>
          <Select value={threatLevel} onValueChange={setThreatLevel}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["green","yellow","orange","red","black"].map(l => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-mono">STATUS</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["stable","contested","lost","quarantined"].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-[10px] font-mono">INTEL NOTES</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="font-mono text-xs bg-muted" rows={2} /></div>
      <Button type="submit" size="sm" className="font-mono text-xs"><Plus className="w-3 h-3 mr-1" />ADD TERRITORY</Button>
    </form>
  );
}

function CreateEventForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("broadcast");
  const [severity, setSeverity] = useState("info");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await base44.entities.GameEvent.create({ title, event_type: eventType, severity, description, is_active: true });
    toast({ title: "Event broadcast sent" });
    setTitle(""); setDescription("");
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label className="text-[10px] font-mono">TITLE</Label><Input value={title} onChange={e => setTitle(e.target.value)} required className="h-8 font-mono text-xs bg-muted" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono">TYPE</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["combat","discovery","faction_war","trade","anomaly","broadcast","system"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-mono">SEVERITY</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["info","warning","alert","critical"].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-[10px] font-mono">DESCRIPTION</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="font-mono text-xs bg-muted" rows={2} /></div>
      <Button type="submit" size="sm" className="font-mono text-xs"><Plus className="w-3 h-3 mr-1" />BROADCAST</Button>
    </form>
  );
}

export default function AdminWorldMgmt() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-mono font-semibold tracking-widest text-primary uppercase">
          World Management
        </h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Manage factions, territories, diplomacy, and world events.
        </p>
      </div>

      <Tabs defaultValue="territory_ops" className="w-full">
        <TabsList className="bg-muted border border-border font-mono flex-wrap">
          <TabsTrigger value="territory_ops" className="text-[10px] font-mono">
            <Flag className="h-3 w-3 mr-1" /> TERRITORY OPS
          </TabsTrigger>
          <TabsTrigger value="territories" className="text-[10px] font-mono">
            <MapPin className="h-3 w-3 mr-1" /> ADD TERRITORY
          </TabsTrigger>
          <TabsTrigger value="factions" className="text-[10px] font-mono">
            <Shield className="h-3 w-3 mr-1" /> CLANS
          </TabsTrigger>
          <TabsTrigger value="diplomacy" className="text-[10px] font-mono">
            <Shield className="h-3 w-3 mr-1" /> DIPLOMACY
          </TabsTrigger>
          <TabsTrigger value="events" className="text-[10px] font-mono">
            <Megaphone className="h-3 w-3 mr-1" /> EVENTS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="territory_ops">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Flag className="h-3.5 w-3.5" /> TERRITORY OPERATIONS
              </CardTitle>
            </CardHeader>
            <CardContent><TerritoryOpsPanel /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="territories">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground tracking-widest">ADD TERRITORY</CardTitle></CardHeader>
            <CardContent><CreateTerritoryForm onCreated={refresh} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factions">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground tracking-widest">REGISTER CLAN</CardTitle></CardHeader>
            <CardContent><CreateFactionForm onCreated={refresh} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diplomacy">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> INTER-FACTION DIPLOMACY
              </CardTitle>
            </CardHeader>
            <CardContent><DiplomacyPanel /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground tracking-widest">BROADCAST EVENT</CardTitle></CardHeader>
            <CardContent><CreateEventForm onCreated={refresh} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}