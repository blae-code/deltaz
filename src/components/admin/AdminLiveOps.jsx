import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Zap, Crosshair, Cloud } from "lucide-react";
import DispatchPanel from "./DispatchPanel";
import AutoAssignPanel from "./AutoAssignPanel";
import MissionForgePanel from "./MissionForgePanel";
import SectorEventAdmin from "./SectorEventAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminLiveOps() {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-mono font-semibold tracking-widest text-primary uppercase">
          Live Operations
        </h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Dispatch operatives, auto-assign missions, forge new operations, and trigger world events.
        </p>
      </div>

      <Tabs defaultValue="dispatch" className="w-full">
        <TabsList className="bg-muted border border-border font-mono">
          <TabsTrigger value="dispatch" className="text-[10px] font-mono">
            <Send className="h-3 w-3 mr-1" /> DISPATCH
          </TabsTrigger>
          <TabsTrigger value="autoassign" className="text-[10px] font-mono">
            <Zap className="h-3 w-3 mr-1" /> AUTO-ASSIGN
          </TabsTrigger>
          <TabsTrigger value="forge" className="text-[10px] font-mono">
            <Crosshair className="h-3 w-3 mr-1" /> MISSION FORGE
          </TabsTrigger>
          <TabsTrigger value="sector_events" className="text-[10px] font-mono">
            <Cloud className="h-3 w-3 mr-1" /> SECTOR EVENTS
          </TabsTrigger>
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

        <TabsContent value="forge">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Crosshair className="h-3.5 w-3.5" /> AUTOMATED MISSION GENERATOR
              </CardTitle>
            </CardHeader>
            <CardContent><MissionForgePanel /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sector_events">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Cloud className="h-3.5 w-3.5" /> SECTOR EVENT ENGINE
              </CardTitle>
            </CardHeader>
            <CardContent><SectorEventAdmin /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}