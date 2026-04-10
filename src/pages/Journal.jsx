import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import useCurrentUser from "../hooks/useCurrentUser";
import PageShell from "../components/layout/PageShell";
import DataCard from "../components/terminal/DataCard";
import TerminalLoader from "../components/terminal/TerminalLoader";
import ActionRail from "../components/layout/ActionRail";
import JournalTimeline from "../components/journal/JournalTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, Archive, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import CornerAccentSvg from "../components/svg/CornerAccentSvg";

const TABS = [
  { key: "notes", label: "Notes", icon: BookOpen },
  { key: "timeline", label: "Timeline", icon: Clock },
];

export default function Journal() {
  const { user } = useCurrentUser();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("notes");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const { toast } = useToast();

  const loadData = async () => {
    if (!user?.email) return;
    const ents = await base44.entities.JournalEntry.filter(
      { player_email: user.email },
      "-created_date",
      100
    );
    setEntries(ents);
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.email) return;
    loadData();
    const unsub = base44.entities.JournalEntry.subscribe((ev) => {
      if (ev.type === "create") setEntries((prev) => [ev.data, ...prev]);
      else if (ev.type === "update")
        setEntries((prev) => prev.map((e) => (e.id === ev.id ? ev.data : e)));
    });
    return unsub;
  }, [user?.email]);

  const handleCreate = async () => {
    if (!formTitle.trim() || !formBody.trim()) return;
    setSaving(true);
    try {
      await base44.entities.JournalEntry.create({
        player_email: user.email,
        title: formTitle.trim(),
        narrative: formBody.trim(),
        category: "field_note",
        status: "active",
      });
      setFormTitle("");
      setFormBody("");
      setShowForm(false);
      toast({ title: "Entry logged", description: "Field note saved to journal." });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleArchive = async (id) => {
    try {
      await base44.entities.JournalEntry.update(id, { status: "resolved" });
    } catch (err) {
      toast({ title: "Archive failed", description: err.message, variant: "destructive" });
    }
  };

  const active = entries.filter((e) => e.status !== "resolved");
  const archived = entries.filter((e) => e.status === "resolved");

  if (loading) {
    return (
      <PageShell title="Field Journal" subtitle="Personal notes from the field">
        <TerminalLoader size="lg" messages={["LOADING JOURNAL...", "DECRYPTING FIELD NOTES...", "QUERYING ARCHIVES..."]} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Field Journal"
      subtitle="Personal notes from the field"
      actions={
        <Button
          size="sm"
          className="h-7 text-[10px] uppercase tracking-wider"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-3 w-3 mr-1" />
          New Entry
        </Button>
      }
    >
      {/* Entry form */}
      {showForm && (
        <div className="panel-frame p-4 space-y-3">
          <p className="text-[9px] font-mono text-primary/50 tracking-[0.3em] uppercase">// NEW FIELD NOTE</p>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Entry title..."
              className="h-8 text-xs bg-secondary/50 border-border"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Note</Label>
            <Textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              placeholder="What happened out there..."
              className="text-xs bg-secondary/50 border-border min-h-[100px] resize-none"
              maxLength={2000}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-[10px] uppercase tracking-wider"
              onClick={handleCreate}
              disabled={saving || !formTitle.trim() || !formBody.trim()}
            >
              {saving ? "SAVING..." : "LOG ENTRY"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] uppercase tracking-wider text-muted-foreground"
              onClick={() => { setShowForm(false); setFormTitle(""); setFormBody(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ActionRail tabs={TABS} active={tab} onChange={setTab} />

      {tab === "notes" && (
        <div className="space-y-3">
          {active.length === 0 ? (
            <DataCard title="No Entries">
              <div className="text-center py-6">
                <BookOpen className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nothing logged yet. Hit "New Entry" to record a field note.
                </p>
              </div>
            </DataCard>
          ) : (
            active.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onArchive={handleArchive} />
            ))
          )}

          {archived.length > 0 && (
            <div className="pt-2">
              <p className="text-[9px] font-mono text-muted-foreground/40 tracking-[0.3em] uppercase mb-2">
                // ARCHIVED ({archived.length})
              </p>
              <div className="space-y-2">
                {archived.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} archived />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <JournalTimeline entries={[...active, ...archived]} />
      )}
    </PageShell>
  );
}

function EntryCard({ entry, onArchive, archived }) {
  return (
    <div className={`panel-frame clip-corner-br overflow-hidden transition-opacity ${archived ? "opacity-50" : "hover:border-primary/25"}`}>
      {/* Header */}
      <div className="relative flex items-center gap-2 border-b border-border/50 px-4 py-2.5 bg-secondary/20 overflow-hidden">
        {/* Sweep shimmer */}
        <div className="card-header-sweep" aria-hidden="true" />
        <BookOpen className="h-3 w-3 text-primary/60 shrink-0 relative" />
        <span className="flex-1 min-w-0 text-[11px] font-semibold font-display tracking-wider text-foreground uppercase truncate relative">
          {entry.title}
        </span>
        <span className="text-[8px] text-muted-foreground font-mono shrink-0 relative">
          {new Date(entry.created_date).toLocaleDateString()}
        </span>
        {!archived && onArchive && (
          <button
            onClick={() => onArchive(entry.id)}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors ml-1 shrink-0 relative"
            title="Archive this entry"
          >
            <Archive className="h-3 w-3" />
          </button>
        )}
        {/* Corner accent bracket */}
        <div className="absolute right-0 top-0 pointer-events-none">
          <CornerAccentSvg corner="tr" size={12} />
        </div>
      </div>

      {/* Body — left amber rule on active entries */}
      <div className={`px-4 py-3 ${!archived ? "border-l-2 border-primary/20" : ""}`}>
        <p className="text-[12px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {entry.narrative}
        </p>
      </div>
    </div>
  );
}