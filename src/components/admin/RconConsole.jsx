import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Trash2, Terminal } from "lucide-react";
import DataCard from "../terminal/DataCard";

const PRESETS = [
  { label: "List Players", command: "ListPlayers" },
  { label: "Save World", command: "SaveWorld" },
  { label: "Server Info", command: "GetServerOptions" },
  { label: "Get Chat", command: "GetChat" },
  { label: "Day Time", command: "SetTimeOfDay 12:00" },
  { label: "Night Time", command: "SetTimeOfDay 00:00" },
  { label: "Destroy Wild Dinos", command: "DestroyWildDinos" },
];

export default function RconConsole() {
  const [command, setCommand] = useState("");
  const [log, setLog] = useState([]);
  const [sending, setSending] = useState(false);
  const logEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const execute = async (cmd) => {
    const trimmed = (cmd || command).trim();
    if (!trimmed) return;

    const entry = { id: Date.now(), command: trimmed, response: null, error: null, time: new Date() };
    setLog((prev) => [...prev, entry]);
    setCommand("");
    setSending(true);

    try {
      const res = await base44.functions.invoke("serverManager", {
        action: "rcon",
        command: trimmed,
      });
      setLog((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, response: res.data.result || "(no output)" } : e
        )
      );
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Unknown error";
      setLog((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, error: msg } : e))
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !sending) execute();
  };

  const handlePreset = (val) => {
    if (val) execute(val);
  };

  return (
    <DataCard title="RCON Console" headerRight={
      <button
        onClick={() => setLog([])}
        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        disabled={log.length === 0}
      >
        <Trash2 className="h-3 w-3" /> Clear
      </button>
    }>
      <div className="space-y-3">
        {/* Preset commands */}
        <div className="flex flex-wrap gap-1.5">
          <Select onValueChange={handlePreset}>
            <SelectTrigger className="w-44 h-8 text-[10px] uppercase tracking-wider">
              <SelectValue placeholder="Quick commands..." />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.command} value={p.command} className="text-xs font-mono">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {PRESETS.slice(0, 4).map((p) => (
            <Button
              key={p.command}
              variant="outline"
              size="sm"
              className="text-[10px] h-8 uppercase tracking-wider font-mono"
              onClick={() => execute(p.command)}
              disabled={sending}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Log output */}
        <div className="bg-background border border-border rounded-sm h-64 overflow-y-auto p-3 font-mono text-xs space-y-2">
          {log.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2">
              <Terminal className="h-8 w-8" />
              <span className="text-[10px] tracking-widest uppercase">Awaiting RCON command...</span>
            </div>
          )}
          {log.map((entry) => (
            <div key={entry.id} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-primary select-none">&gt;</span>
                <span className="text-foreground">{entry.command}</span>
                <span className="text-muted-foreground/50 text-[9px] ml-auto">
                  {entry.time.toLocaleTimeString()}
                </span>
              </div>
              {entry.response !== null && (
                <pre className="text-muted-foreground whitespace-pre-wrap pl-4 text-[11px] leading-relaxed">
                  {entry.response}
                </pre>
              )}
              {entry.error && (
                <pre className="text-destructive whitespace-pre-wrap pl-4 text-[11px] leading-relaxed">
                  ERROR: {entry.error}
                </pre>
              )}
              {entry.response === null && !entry.error && (
                <div className="pl-4 flex items-center gap-1.5 text-muted-foreground/50">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px]">Executing...</span>
                </div>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Command input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type RCON command..."
            className="flex-1 font-mono text-xs h-9"
            disabled={sending}
          />
          <Button
            size="sm"
            className="h-9 px-4 text-[10px] uppercase tracking-wider"
            onClick={() => execute()}
            disabled={sending || !command.trim()}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
          Commands execute directly on the game server via RCON. All commands are logged to the server audit trail.
        </p>
      </div>
    </DataCard>
  );
}