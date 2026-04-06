import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "../hooks/useCurrentUser";
import AuthLoadingState from "../components/terminal/AuthLoadingState";
import ActionRail from "../components/layout/ActionRail";
import DataCard from "../components/terminal/DataCard";
import JournalEventCard from "../components/journal/JournalEventCard";
import JournalTimeline from "../components/journal/JournalTimeline";
import ConsequenceChain from "../components/journal/ConsequenceChain";
import ConsequenceTagCloud from "../components/journal/ConsequenceTagCloud";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, GitBranch, Tag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Journal() {
  const { user } = useCurrentUser();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState("active"); // active | resolved | timeline
  const { toast } = useToast();

  const loadData = async () => {
    if (!user?.email) return;
    const ents = await base44.entities.JournalEntry.filter({ player_email: user.email }, "-created_date", 100);
    setEntries(ents);
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.email) return;
    loadData();
    const unsub = base44.entities.JournalEntry.subscribe((ev) => {
      if (ev.type === "create") setEntries(prev => [ev.data, ...prev]);
      else if (ev.type === "update") setEntries(prev => prev.map(e => e.id === ev.id ? ev.data : e));
    });
    return unsub;
  }, [user?.email]);

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
      const res = await base44.functions.invoke("resolveJournalChoice", { entry_id: entryId, choice_id: choiceId });
      const data = res.data;
      const parts = [];
      if (data.reputation_effect) parts.push(`Rep ${data.reputation_effect.delta > 0 ? '+' : ''}${data.reputation_effect.delta}`);
      if (data.world_effects?.length) parts.push(`${data.world_effects.length} world effect(s)`);
      if (data.followup_entry_id) parts.push('Follow-up event spawned!');
      toast({ title: 'Choice resolved', description: parts.join(' · ') || 'The consequences unfold...' });
      loadData();
    } catch (err) {
      toast({ title: "Choice failed", description: err.message, variant: "destructive" });
    }
  };

  const pending = entries.filter(e => e.status === "pending");
  const resolved = entries.filter(e => e.status === "resolved");

  if (loading) {
    return (
      <div className="space-y-5 max-w-3xl">
        <AuthLoadingState message="LOADING JOURNAL..." />
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
      <ActionRail
        tabs={[
          { key: "active", label: `Pending`, icon: BookOpen, count: pending.length },
          { key: "resolved", label: `Resolved`, count: resolved.length },
          { key: "chains", label: "Branches", icon: GitBranch },
          { key: "timeline", label: "Timeline" },
        ]}
        active={tab}
        onChange={setTab}
      />

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

      {tab === "chains" && <ConsequenceChain entries={entries} />}

      {tab === "timeline" && <JournalTimeline entries={resolved} />}

      {/* Story Threads — visible on all tabs */}
      <ConsequenceTagCloud entries={entries} />
    </div>
  );
}