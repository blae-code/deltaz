import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../components/terminal/DataCard";
import JournalEventCard from "../components/journal/JournalEventCard";
import JournalTimeline from "../components/journal/JournalTimeline";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Journal() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState("active"); // active | resolved | timeline
  const { toast } = useToast();

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const ents = await base44.entities.JournalEntry.filter({ player_email: u.email }, "-created_date", 100);
    setEntries(ents);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.JournalEntry.subscribe((ev) => {
      if (ev.type === "create") setEntries(prev => [ev.data, ...prev]);
      else if (ev.type === "update") setEntries(prev => prev.map(e => e.id === ev.id ? ev.data : e));
    });
    return unsub;
  }, []);

  const generateEvent = async () => {
    setGenerating(true);
    try {
      await base44.functions.invoke("generateJournalEvent", {});
      toast({ title: "New event generated", description: "A narrative event has been created for your journal." });
      loadData();
    } catch (err) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleChoice = async (entryId, choiceId) => {
    try {
      await base44.functions.invoke("resolveJournalChoice", { entry_id: entryId, choice_id: choiceId });
      loadData();
    } catch (err) {
      toast({ title: "Choice failed", description: err.message, variant: "destructive" });
    }
  };

  const pending = entries.filter(e => e.status === "pending");
  const resolved = entries.filter(e => e.status === "resolved");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xs tracking-widest animate-pulse">LOADING JOURNAL...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold font-display tracking-wider text-primary uppercase">Active Journal</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Narrative events that shape your story — your choices ripple through the world
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 text-[10px] uppercase tracking-wider"
          onClick={generateEvent}
          disabled={generating || pending.length >= 3}
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <BookOpen className="h-3 w-3 mr-1" />}
          {pending.length >= 3 ? "RESOLVE EXISTING" : "SEEK EVENT"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border pb-2">
        {[
          { key: "active", label: `Pending (${pending.length})` },
          { key: "resolved", label: `Resolved (${resolved.length})` },
          { key: "timeline", label: "Timeline" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[9px] uppercase tracking-wider font-mono px-2.5 py-1 rounded-sm transition-colors ${
              tab === t.key
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "active" && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <DataCard title="No Active Events">
              <div className="text-center py-6">
                <BookOpen className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  No pending events. Click "Seek Event" to discover what the wasteland has in store.
                </p>
              </div>
            </DataCard>
          ) : (
            pending.map(entry => (
              <JournalEventCard key={entry.id} entry={entry} onChoice={handleChoice} />
            ))
          )}
        </div>
      )}

      {tab === "resolved" && (
        <div className="space-y-3">
          {resolved.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No resolved events yet.</p>
          ) : (
            resolved.map(entry => (
              <JournalEventCard key={entry.id} entry={entry} resolved />
            ))
          )}
        </div>
      )}

      {tab === "timeline" && <JournalTimeline entries={resolved} />}
    </div>
  );
}