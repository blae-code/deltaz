import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DataCard from "../terminal/DataCard";
import { BookOpen, Save, Loader2, Sparkles, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const FIELDS = [
  { key: "character_name", label: "CHARACTER NAME", placeholder: "e.g. Viktor 'Ironjaw' Koval", type: "input", maxLength: 60 },
  { key: "age", label: "AGE", placeholder: "e.g. 34", type: "input", maxLength: 10 },
  { key: "origin", label: "ORIGIN", placeholder: "e.g. Former military engineer from Novosibirsk", type: "input", maxLength: 100 },
  { key: "backstory", label: "BACKSTORY", placeholder: "How did they end up in the wasteland? What shaped them before the fall?", type: "textarea" },
  { key: "personality", label: "PERSONALITY", placeholder: "e.g. Paranoid but fiercely loyal. Hoards canned food. Talks to their rifle.", type: "textarea" },
  { key: "skills", label: "SKILLS & SPECIALIZATIONS", placeholder: "e.g. Expert tracker, field medic, terrible cook", type: "textarea" },
  { key: "weaknesses", label: "FLAWS & VULNERABILITIES", placeholder: "e.g. Claustrophobic, can't say no to a gamble, trusts too easily", type: "textarea" },
  { key: "appearance", label: "APPEARANCE", placeholder: "e.g. Scarred face, one cybernetic eye, always wearing a faded bomber jacket", type: "textarea" },
  { key: "faction_loyalty", label: "FACTION LOYALTY", placeholder: "Which clan do they feel drawn to and why?", type: "textarea" },
  { key: "goals", label: "GOALS", placeholder: "What drives them? What are they searching for?", type: "textarea" },
  { key: "catchphrase", label: "CATCHPHRASE / MOTTO", placeholder: "e.g. 'Dead men don't complain about the weather.'", type: "input", maxLength: 120 },
];

export default function CharacterProfileEditor({ userEmail }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.CharacterProfile.filter({ player_email: userEmail }, "-created_date", 1)
      .then((profiles) => {
        if (profiles.length > 0) {
          setProfile(profiles[0]);
          setExistingId(profiles[0].id);
          const data = {};
          FIELDS.forEach((f) => { data[f.key] = profiles[0][f.key] || ""; });
          setForm(data);
        } else {
          const data = {};
          FIELDS.forEach((f) => { data[f.key] = ""; });
          setForm(data);
        }
      })
      .finally(() => setLoading(false));
  }, [userEmail]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, player_email: userEmail };
    if (existingId) {
      await base44.entities.CharacterProfile.update(existingId, payload);
    } else {
      const created = await base44.entities.CharacterProfile.create(payload);
      setExistingId(created.id);
    }
    toast({ title: "Character profile saved", description: "AI systems will now reference your character data." });
    setSaving(false);
  };

  if (loading) {
    return (
      <DataCard title="Character Profile">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        </div>
      </DataCard>
    );
  }

  const filledFields = FIELDS.filter((f) => form[f.key]?.trim()).length;

  return (
    <DataCard
      title="Character Profile — Roleplay"
      headerRight={
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-accent" />
          <span className="text-[9px] text-accent tracking-wider">AI-INTEGRATED</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-2.5 border border-accent/20 bg-accent/5 rounded-sm p-3">
          <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-accent font-semibold tracking-wider">OPTIONAL ROLEPLAY DATA</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              This is your fictional character's profile. The AI systems (ARTEMIS, GHOST PROTOCOL, Mission Forge) will use this
              information to personalize briefings, narration, and mission assignments to match your character's story.
              Fill in as much or as little as you like.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${(filledFields / FIELDS.length) * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground tracking-wider">
            {filledFields}/{FIELDS.length} FIELDS
          </span>
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                {field.label}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  value={form[field.key] || ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="text-xs bg-secondary/50 border-border min-h-[60px] resize-none"
                  maxLength={500}
                />
              ) : (
                <Input
                  value={form[field.key] || ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-8 text-xs bg-secondary/50 border-border"
                  maxLength={field.maxLength || 100}
                />
              )}
            </div>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full font-mono text-xs uppercase tracking-wider"
        >
          <Save className="h-3.5 w-3.5 mr-2" />
          {saving ? "SAVING..." : existingId ? "UPDATE CHARACTER" : "CREATE CHARACTER"}
        </Button>
      </div>
    </DataCard>
  );
}