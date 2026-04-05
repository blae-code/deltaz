import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Plus, Trash2, Send, Zap, Flag, Coins, Crosshair, ArrowLeftRight, Users } from "lucide-react";
import DispatchPanel from "../components/admin/DispatchPanel";
import AutoAssignPanel from "../components/admin/AutoAssignPanel";
import TerritoryOpsPanel from "../components/admin/TerritoryOpsPanel";
import ResourceDashboard from "../components/admin/ResourceDashboard";
import MissionForgePanel from "../components/admin/MissionForgePanel";
import TradePanel from "../components/admin/TradePanel";
import DiplomacyPanel from "../components/admin/DiplomacyPanel";
import SurvivorAdminPanel from "../components/admin/SurvivorAdminPanel";
import { useToast } from "@/components/ui/use-toast";

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
    onCreated();
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

function CreateJobForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("recon");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await base44.entities.Job.create({ title, type, priority, description, reward, status: "available" });
    toast({ title: "Job created" });
    setTitle(""); setDescription(""); setReward("");
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label className="text-[10px] font-mono">TITLE</Label><Input value={title} onChange={e => setTitle(e.target.value)} required className="h-8 font-mono text-xs bg-muted" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono">TYPE</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["recon","extraction","sabotage","delivery","defense","bounty"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-mono">PRIORITY</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 font-mono text-xs bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["low","medium","high","critical"].map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-[10px] font-mono">BRIEFING</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="font-mono text-xs bg-muted" rows={2} /></div>
      <div><Label className="text-[10px] font-mono">REWARD</Label><Input value={reward} onChange={e => setReward(e.target.value)} className="h-8 font-mono text-xs bg-muted" /></div>
      <Button type="submit" size="sm" className="font-mono text-xs"><Plus className="w-3 h-3 mr-1" />POST JOB</Button>
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
    onCreated();
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
    onCreated();
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

export default function Admin() {
  const [user, setUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const refresh = () => setRefreshKey(k => k + 1);

  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-3" />
          <div className="font-mono text-sm text-destructive">ACCESS DENIED</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">COMMAND CLEARANCE REQUIRED</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-mono font-bold text-primary terminal-glow tracking-widest">COMMAND CENTER</h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">GAME MASTER OPERATIONS</p>
      </div>

      <Tabs defaultValue="dispatch" className="w-full">
        <TabsList className="bg-muted border border-border font-mono">
          <TabsTrigger value="dispatch" className="text-xs font-mono">DISPATCH</TabsTrigger>
          <TabsTrigger value="autoassign" className="text-xs font-mono">AUTO-ASSIGN</TabsTrigger>
          <TabsTrigger value="jobs" className="text-xs font-mono">JOBS</TabsTrigger>
          <TabsTrigger value="events" className="text-xs font-mono">EVENTS</TabsTrigger>
          <TabsTrigger value="factions" className="text-xs font-mono">CLANS</TabsTrigger>
          <TabsTrigger value="territories" className="text-xs font-mono">TERRITORIES</TabsTrigger>
          <TabsTrigger value="territory_ops" className="text-xs font-mono">TERRITORY OPS</TabsTrigger>
          <TabsTrigger value="mission_forge" className="text-xs font-mono">MISSION FORGE</TabsTrigger>
          <TabsTrigger value="diplomacy" className="text-xs font-mono">DIPLOMACY</TabsTrigger>
          <TabsTrigger value="trade" className="text-xs font-mono">TRADE</TabsTrigger>
          <TabsTrigger value="economy" className="text-xs font-mono">ECONOMY</TabsTrigger>
          <TabsTrigger value="survivors" className="text-xs font-mono">SURVIVORS</TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Send className="h-3.5 w-3.5" /> DISPATCH OPERATIVE
              </CardTitle>
            </CardHeader>
            <CardContent><DispatchPanel /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autoassign">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" /> AUTO-ASSIGN OPERATIVES
              </CardTitle>
            </CardHeader>
            <CardContent><AutoAssignPanel /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground tracking-widest">POST NEW OPERATION</CardTitle></CardHeader>
            <CardContent><CreateJobForm onCreated={refresh} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground tracking-widest">BROADCAST EVENT</CardTitle></CardHeader>
            <CardContent><CreateEventForm onCreated={refresh} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factions">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground tracking-widest">REGISTER CLAN</CardTitle></CardHeader>
            <CardContent><CreateFactionForm onCreated={refresh} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="territories">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground tracking-widest">ADD TERRITORY</CardTitle></CardHeader>
            <CardContent><CreateTerritoryForm onCreated={refresh} /></CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="mission_forge">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Crosshair className="h-3.5 w-3.5" /> AUTOMATED MISSION GENERATOR
              </CardTitle>
            </CardHeader>
            <CardContent><MissionForgePanel /></CardContent>
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

        <TabsContent value="trade">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <ArrowLeftRight className="h-3.5 w-3.5" /> INTER-FACTION TRADE
              </CardTitle>
            </CardHeader>
            <CardContent><TradePanel /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="economy">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Coins className="h-3.5 w-3.5" /> RESOURCE ECONOMY CONTROL
              </CardTitle>
            </CardHeader>
            <CardContent><ResourceDashboard /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="survivors">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Users className="h-3.5 w-3.5" /> SURVIVOR COLONY MANAGEMENT
              </CardTitle>
            </CardHeader>
            <CardContent><SurvivorAdminPanel /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}