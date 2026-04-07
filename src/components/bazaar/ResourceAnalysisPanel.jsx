import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataCard from "../terminal/DataCard";
import { Brain, AlertTriangle, TrendingDown, MapPin, ArrowLeftRight, Loader2, BarChart3 } from "lucide-react";

const RISK_STYLES = {
  low: "text-status-ok border-status-ok/20 bg-status-ok/5",
  medium: "text-accent border-accent/20 bg-accent/5",
  high: "text-status-warn border-status-warn/20 bg-status-warn/5",
  critical: "text-destructive border-destructive/20 bg-destructive/5",
};

const URGENCY_DOT = {
  low: "bg-status-ok",
  medium: "bg-accent",
  high: "bg-status-warn",
  critical: "bg-destructive",
};

export default function ResourceAnalysisPanel() {
  const [analysis, setAnalysis] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [section, setSection] = useState("summary");

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke("resourceAnalysis", {});
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setAnalysis(res.data.analysis);
      setMeta(res.data.meta);
    }
    setLoading(false);
  };

  if (!analysis) {
    return (
      <DataCard title="AI Resource Analyst" headerRight={
        <Brain className="h-3.5 w-3.5 text-primary" />
      }>
        <div className="text-center py-6 space-y-3">
          <Brain className="h-8 w-8 text-primary/30 mx-auto" />
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            AI analysis of resource nodes, depletion forecasts, and trade opportunities based on current colony data.
          </p>
          {error && <p className="text-[10px] text-destructive">{error}</p>}
          <Button
            size="sm"
            className="text-[10px] uppercase tracking-wider h-8 gap-1.5"
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
            {loading ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>
      </DataCard>
    );
  }

  const sections = [
    { id: "summary", label: "Summary" },
    { id: "depletion", label: "Depletion", count: analysis.depletion_forecasts?.length },
    { id: "harvest", label: "Harvesting", count: analysis.harvesting_strategy?.length },
    { id: "trade", label: "Trade Ops", count: analysis.trade_recommendations?.length },
    { id: "risks", label: "Risks", count: analysis.risk_alerts?.length },
  ];

  return (
    <DataCard title="AI Resource Analysis" headerRight={
      <div className="flex items-center gap-2">
        {meta && (
          <span className="text-[8px] text-muted-foreground font-mono">
            {meta.active_nodes} nodes / {meta.open_listings} listings
          </span>
        )}
        <Button variant="ghost" size="sm" className="h-6 text-[8px] gap-1" onClick={runAnalysis} disabled={loading}>
          {loading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Brain className="h-2.5 w-2.5" />}
          Refresh
        </Button>
      </div>
    }>
      <div className="space-y-3">
        {/* Section tabs */}
        <div className="flex gap-1 flex-wrap">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                section === s.id
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-secondary/30 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {s.label} {s.count > 0 ? `(${s.count})` : ""}
            </button>
          ))}
        </div>

        {/* Summary */}
        {section === "summary" && (
          <div className="border border-primary/20 bg-primary/5 rounded-sm px-3 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-primary uppercase tracking-wider font-semibold">Executive Summary</span>
            </div>
            <p className="text-[11px] text-foreground leading-relaxed">{analysis.summary}</p>
          </div>
        )}

        {/* Depletion Forecasts */}
        {section === "depletion" && (
          <div className="space-y-2">
            {(analysis.depletion_forecasts || []).map((f, i) => (
              <div key={i} className={`border rounded-sm px-3 py-2.5 ${RISK_STYLES[f.risk_level] || RISK_STYLES.medium}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-[11px] font-mono font-bold uppercase">{f.resource}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] uppercase">{f.risk_level} risk</Badge>
                    {f.cycles_remaining > 0 && (
                      <span className="text-[9px] font-mono">~{f.cycles_remaining} cycles</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-muted-foreground mb-1">
                  <span>Active: {f.active_nodes || 0}</span>
                  <span>Depleted: {f.depleted_nodes || 0}</span>
                </div>
                <p className="text-[10px] opacity-80 leading-snug">{f.reasoning}</p>
              </div>
            ))}
            {(!analysis.depletion_forecasts || analysis.depletion_forecasts.length === 0) && (
              <p className="text-[10px] text-muted-foreground text-center py-4">No depletion data available.</p>
            )}
          </div>
        )}

        {/* Harvesting Strategy */}
        {section === "harvest" && (
          <div className="space-y-2">
            {(analysis.harvesting_strategy || []).map((h, i) => (
              <div key={i} className="border border-border bg-secondary/20 rounded-sm px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-5 w-5 rounded-sm bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {h.priority || i + 1}
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-foreground">{h.action}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground mb-1 ml-7">
                  {h.sector && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {h.sector}
                    </span>
                  )}
                  {h.resource && (
                    <Badge variant="outline" className="text-[8px]">{h.resource}</Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug ml-7">{h.reasoning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Trade Recommendations */}
        {section === "trade" && (
          <div className="space-y-2">
            {(analysis.trade_recommendations || []).map((t, i) => (
              <div key={i} className="border border-border bg-secondary/20 rounded-sm px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-3 w-3 text-accent" />
                    <span className="text-[11px] font-mono font-semibold text-foreground">{t.action}</span>
                  </div>
                  {t.urgency && (
                    <div className="flex items-center gap-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${URGENCY_DOT[t.urgency] || URGENCY_DOT.medium}`} />
                      <span className="text-[8px] text-muted-foreground uppercase">{t.urgency}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[9px] ml-5 mb-1">
                  <Badge variant="outline" className="text-[8px]">{t.type}</Badge>
                  {t.resource && <Badge variant="outline" className="text-[8px]">{t.resource}</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug ml-5">{t.reasoning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Risk Alerts */}
        {section === "risks" && (
          <div className="space-y-2">
            {(analysis.risk_alerts || []).length === 0 ? (
              <div className="text-center py-4 border border-dashed border-status-ok/20 rounded-sm">
                <p className="text-[10px] text-status-ok">No critical risks detected.</p>
              </div>
            ) : (
              (analysis.risk_alerts || []).map((r, i) => (
                <div key={i} className={`border rounded-sm px-3 py-2.5 ${RISK_STYLES[r.severity] || RISK_STYLES.medium}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[11px] font-mono font-bold">{r.title}</span>
                    <Badge variant="outline" className="text-[8px] uppercase">{r.severity}</Badge>
                  </div>
                  <p className="text-[10px] opacity-80 leading-snug">{r.detail}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DataCard>
  );
}