import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import DossierSummaryCard from "../components/dossier/DossierSummaryCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function WeeklyDossier() {
  const [user, setUser] = useState(null);
  const [factions, setFactions] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [economies, setEconomies] = useState([]);
  const [selectedFaction, setSelectedFaction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Faction.list("-created_date", 50),
      base44.entities.Territory.list("-created_date", 100),
      base44.entities.Job.list("-created_date", 100),
      base44.entities.FactionEconomy.list("-created_date", 50),
    ]).then(([u, f, t, j, e]) => {
      setUser(u);
      setFactions(f);
      setTerritories(t);
      setJobs(j);
      setEconomies(e);
    }).finally(() => setLoading(false));
  }, []);

  const faction = factions.find(f => f.id === selectedFaction);
  const factionTerritories = territories.filter(t => t.controlling_faction_id === selectedFaction);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
  const recentJobs = jobs.filter(j => j.faction_id === selectedFaction && j.created_date >= weekAgo);
  const economy = economies.find(e => e.faction_id === selectedFaction);

  const generatePDF = async () => {
    if (!selectedFaction) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("weeklyDossier", { faction_id: selectedFaction });
      // res.data is the PDF arraybuffer via axios
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dossier-${faction?.tag || "faction"}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Dossier Generated", description: "PDF download started." });
    } catch (err) {
      toast({ title: "Generation Failed", description: err.message || "Unable to compile dossier.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">COMPILING INTELLIGENCE...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">
          Weekly Dossier Generator
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Compile a classified intelligence report for any faction — territory control, mission performance, reputation standings, and diplomacy.
        </p>
      </div>

      <DataCard title="Select Faction">
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono block mb-1">
                Target Faction
              </label>
              <Select value={selectedFaction} onValueChange={setSelectedFaction}>
                <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border font-mono">
                  <SelectValue placeholder="Choose a faction..." />
                </SelectTrigger>
                <SelectContent>
                  {factions.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      [{f.tag || "??"}] {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generatePDF}
              disabled={!selectedFaction || generating}
              className="h-8 text-[10px] uppercase tracking-wider font-mono gap-2"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {generating ? "GENERATING..." : "DOWNLOAD PDF"}
            </Button>
          </div>

          {selectedFaction && (
            <div className="text-[9px] text-muted-foreground font-mono border-t border-border pt-3 mt-3">
              <span className="text-primary">REPORT INCLUDES:</span> Faction overview, territory control map, 7-day mission performance, operative reputation standings, diplomatic relations, and recent intelligence.
            </div>
          )}
        </div>
      </DataCard>

      {/* Live preview of selected faction data */}
      {faction && (
        <DossierSummaryCard
          faction={faction}
          territories={factionTerritories}
          recentJobs={recentJobs}
          economy={economy}
        />
      )}

      {/* Recent missions breakdown */}
      {faction && recentJobs.length > 0 && (
        <DataCard title="7-Day Mission Breakdown">
          <div className="space-y-2 max-h-64 overflow-auto">
            {recentJobs.map(j => {
              const statusColor = j.status === "completed" ? "text-status-ok" : j.status === "failed" ? "text-status-danger" : "text-accent";
              return (
                <div key={j.id} className="flex items-center justify-between bg-secondary/30 rounded-sm px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] font-mono font-bold uppercase ${statusColor}`}>
                      {j.status}
                    </span>
                    <span className="text-xs font-mono text-foreground truncate">{j.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">{j.type}</span>
                    <span className="text-[9px] font-mono text-primary">{j.reward_credits || 0}c</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}

      {/* Territory breakdown */}
      {faction && factionTerritories.length > 0 && (
        <DataCard title="Controlled Territories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {factionTerritories.map(t => {
              const threatColor = t.threat_level === "critical" || t.threat_level === "high" ? "text-status-danger" : t.threat_level === "moderate" ? "text-status-warn" : "text-status-ok";
              return (
                <div key={t.id} className="bg-secondary/30 rounded-sm px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-foreground">{t.name}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{t.sector}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                      {t.status}
                    </span>
                    <span className={`text-[9px] font-mono uppercase ${threatColor}`}>
                      THREAT: {t.threat_level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
}