import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, ShieldCheck, CalendarClock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServerDashboard from "./ServerDashboard";
import WhitelistPanel from "./WhitelistPanel";
import SchedulerPanel from "./SchedulerPanel";

export default function AdminServerPanel() {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-mono font-semibold tracking-widest text-primary uppercase">
          Server &amp; Admin
        </h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Server status, power controls, player whitelist, and RCON management.
        </p>
      </div>

      <Tabs defaultValue="server" className="w-full">
        <TabsList className="bg-muted border border-border font-mono">
          <TabsTrigger value="server" className="text-[10px] font-mono">
            <Server className="h-3 w-3 mr-1" /> SERVER
          </TabsTrigger>
          <TabsTrigger value="whitelist" className="text-[10px] font-mono">
            <ShieldCheck className="h-3 w-3 mr-1" /> WHITELIST
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="text-[10px] font-mono">
            <CalendarClock className="h-3 w-3 mr-1" /> SCHEDULER
          </TabsTrigger>
        </TabsList>

        <TabsContent value="server">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <Server className="h-3.5 w-3.5" /> SERVER MANAGEMENT
              </CardTitle>
            </CardHeader>
            <CardContent><ServerDashboard /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whitelist">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> SERVER WHITELIST
              </CardTitle>
            </CardHeader>
            <CardContent><WhitelistPanel /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduler">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xs font-mono text-muted-foreground tracking-widest flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5" /> TASK SCHEDULER
              </CardTitle>
            </CardHeader>
            <CardContent><SchedulerPanel userEmail={user?.email} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}