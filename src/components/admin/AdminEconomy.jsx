import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftRight, Coins, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TradePanel from "./TradePanel";
import ResourceDashboard from "./ResourceDashboard";
import SurvivorAdminPanel from "./SurvivorAdminPanel";

export default function AdminEconomy() {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-mono font-semibold tracking-widest text-primary uppercase">
          Systems &amp; Economy
        </h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          Control trade routes, resource production, economic cycles, and survivor populations.
        </p>
      </div>

      <Tabs defaultValue="economy" className="w-full">
        <TabsList className="bg-muted border border-border font-mono">
          <TabsTrigger value="economy" className="text-[10px] font-mono">
            <Coins className="h-3 w-3 mr-1" /> ECONOMY
          </TabsTrigger>
          <TabsTrigger value="trade" className="text-[10px] font-mono">
            <ArrowLeftRight className="h-3 w-3 mr-1" /> TRADE
          </TabsTrigger>
          <TabsTrigger value="survivors" className="text-[10px] font-mono">
            <Users className="h-3 w-3 mr-1" /> SURVIVORS
          </TabsTrigger>
        </TabsList>

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