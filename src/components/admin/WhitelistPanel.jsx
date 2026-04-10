import { useState, useEffect, useCallback } from "react";
import { addWhitelistEntry, getWhitelistEntries, removeWhitelistEntry } from "@/api/serverApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Plus, Trash2, Shield, Loader2, Users } from "lucide-react";

export default function WhitelistPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [newSteamId, setNewSteamId] = useState("");
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const loadWhitelist = useCallback(async () => {
    setLoading(true);
    try {
      const nextData = await getWhitelistEntries();
      setEntries(nextData.entries || []);
    } catch (err) {
      toast({ title: "Failed to load whitelist", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadWhitelist(); }, [loadWhitelist]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newSteamId.trim() || !/^\d{17}$/.test(newSteamId.trim())) {
      toast({ title: "Invalid Steam ID", description: "Must be a 17-digit Steam64 ID", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const res = await addWhitelistEntry({
        steam_id: newSteamId.trim(),
        callsign: newNote.trim() || undefined,
      });
      toast({ title: res.already_existed ? "Already whitelisted" : "Player whitelisted" });
      setNewSteamId("");
      setNewNote("");
      loadWhitelist();
    } catch (err) {
      toast({ title: "Whitelist failed", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (steamId) => {
    setRemovingId(steamId);
    try {
      await removeWhitelistEntry(steamId);
      toast({ title: "Removed from whitelist" });
      loadWhitelist();
    } catch (err) {
      toast({ title: "Removal failed", description: err.message, variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="border border-primary/20 bg-primary/5 rounded-sm p-3 flex items-start gap-2">
        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] text-primary font-mono font-semibold tracking-wider">AUTO-WHITELIST ACTIVE</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Players are automatically whitelisted when they link their Steam account during registration.
            Use this panel to manually manage entries.
          </p>
        </div>
      </div>

      {/* Manual add form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newSteamId}
          onChange={(e) => setNewSteamId(e.target.value)}
          placeholder="Steam64 ID (17 digits)"
          className="h-8 text-xs font-mono bg-muted flex-1"
          maxLength={17}
        />
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Callsign (optional)"
          className="h-8 text-xs font-mono bg-muted w-40"
        />
        <Button type="submit" size="sm" className="h-8 text-[10px] font-mono" disabled={adding}>
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
          ADD
        </Button>
      </form>

      {/* Whitelist entries */}
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-secondary/50">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-mono font-semibold tracking-wider text-primary uppercase">
              Whitelisted Players
            </span>
            <Badge variant="outline" className="text-[8px]">{entries.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadWhitelist} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <div className="p-4 text-center text-[10px] text-muted-foreground animate-pulse font-mono">
            READING WHITELIST...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-center text-[10px] text-muted-foreground font-mono">
            No entries in whitelist file.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
            {entries.map((entry) => (
              <div key={entry.steam_id} className="flex items-center justify-between px-3 py-2 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-foreground">{entry.steam_id}</span>
                  {entry.note && (
                    <span className="text-[10px] text-muted-foreground">{entry.note}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemove(entry.steam_id)}
                  disabled={removingId === entry.steam_id}
                >
                  {removingId === entry.steam_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
