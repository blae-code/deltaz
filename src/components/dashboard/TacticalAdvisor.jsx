import { useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, MessageSquare } from "lucide-react";
import ArtemisBotSvg from "../svg/ArtemisBotSvg";

export default function TacticalAdvisor() {
  const [advisory, setAdvisory] = useState(null);
  const [callsign, setCallsign] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const requestBriefing = async (q) => {
    setLoading(true);
    const res = await base44.functions.invoke("tacticalAdvisor", { question: q || "" });
    const data = res.data;
    setCallsign(data.callsign);
    const entry = { question: q || null, response: data.advisory, timestamp: Date.now() };
    setHistory((prev) => [entry, ...prev].slice(0, 5));
    setAdvisory(data.advisory);
    setQuestion("");
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    requestBriefing(question);
  };

  return (
    <DataCard
      title="ARTEMIS — Tactical Advisor"
      headerRight={
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] text-primary tracking-wider">ONLINE</span>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Initial prompt or response */}
        {!advisory && !loading && (
          <div className="text-center py-4">
            <ArtemisBotSvg size={36} animated className="text-primary mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground tracking-wider mb-3">
              ARTEMIS TACTICAL AI STANDING BY
            </p>
            <Button
              size="sm"
              onClick={() => requestBriefing("")}
              className="text-[10px] uppercase tracking-wider"
            >
              REQUEST BRIEFING
            </Button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="text-[10px] text-primary tracking-widest animate-pulse">
              ANALYZING SITUATION...
            </span>
          </div>
        )}

        {/* Response history */}
        {!loading && history.length > 0 && (
          <div className="space-y-3">
            {history.map((entry, idx) => (
              <div key={entry.timestamp} className={idx > 0 ? "opacity-50" : ""}>
                {entry.question && (
                  <div className="flex items-start gap-2 mb-1.5">
                    <MessageSquare className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                    <p className="text-[10px] text-accent/80">{entry.question}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <ArtemisBotSvg size={14} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-foreground leading-relaxed">{entry.response}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ask follow-up */}
        {advisory && !loading && (
          <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-border/50">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask ARTEMIS..."
              className="h-7 text-[10px] bg-secondary/50 border-border flex-1"
            />
            <Button type="submit" size="sm" variant="outline" className="h-7 w-7 p-0" disabled={loading}>
              <Send className="h-3 w-3" />
            </Button>
          </form>
        )}
      </div>
    </DataCard>
  );
}