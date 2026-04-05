import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import StatusIndicator from "../components/terminal/StatusIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, Award, LogOut } from "lucide-react";
import ReputationBar from "../components/profile/ReputationBar";
import ReputationHistory from "../components/profile/ReputationHistory";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [reputations, setReputations] = useState([]);
  const [repLogs, setRepLogs] = useState([]);
  const [factions, setFactions] = useState([]);
  const [callsign, setCallsign] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Faction.list("-created_date", 50),
    ]).then(([u, f]) => {
      setUser(u);
      setCallsign(u.callsign || "");
      setFactions(f);
      if (u.email) {
        base44.entities.Reputation.filter({ player_email: u.email })
          .then(setReputations)
          .catch(() => {});
        base44.entities.ReputationLog.filter({ player_email: u.email }, "-created_date", 20)
          .then(setRepLogs)
          .catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, []);

  const saveCallsign = async () => {
    setSaving(true);
    await base44.auth.updateMe({ callsign });
    setUser((prev) => ({ ...prev, callsign }));
    setSaving(false);
  };

  const getFactionName = (id) => factions.find((f) => f.id === id)?.name || "Unknown";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">ACCESSING DOSSIER...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Operative Dossier
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Personal file and reputation standing</p>
      </div>

      {/* Identity */}
      <DataCard title="Identity">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-sm border border-primary/30 bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{user?.full_name || "Unknown"}</p>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] uppercase">{user?.role || "player"}</Badge>
                <StatusIndicator status={user?.status || "active"} label={user?.status || "active"} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Callsign</Label>
            <div className="flex gap-2">
              <Input
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="Enter callsign..."
                className="h-8 text-xs bg-secondary/50 border-border"
              />
              <Button size="sm" className="h-8 text-[10px] uppercase tracking-wider" onClick={saveCallsign} disabled={saving}>
                {saving ? "..." : "SAVE"}
              </Button>
            </div>
          </div>
        </div>
      </DataCard>

      {/* Reputation Bars */}
      <DataCard title="Faction Standing">
        {reputations.length === 0 ? (
          <p className="text-xs text-muted-foreground">No faction reputation records found.</p>
        ) : (
          <div className="space-y-3">
            {reputations.map((rep) => {
              const faction = factions.find((f) => f.id === rep.faction_id);
              return (
                <ReputationBar
                  key={rep.id}
                  reputation={rep}
                  factionName={faction?.name || "Unknown"}
                  factionColor={faction?.color}
                />
              );
            })}
          </div>
        )}
      </DataCard>

      {/* Reputation History */}
      <DataCard title="Reputation Activity Log">
        <ReputationHistory logs={repLogs} factions={factions} />
      </DataCard>

      {/* Actions */}
      <Button
        variant="outline"
        className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={() => base44.auth.logout()}
      >
        <LogOut className="h-3.5 w-3.5 mr-2" />
        DISCONNECT TERMINAL
      </Button>
    </div>
  );
}