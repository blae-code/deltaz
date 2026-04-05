import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import PerformanceRatingGauge from "./PerformanceRatingGauge";
import PerformanceStatsGrid from "./PerformanceStatsGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity, AlertTriangle, Zap, Shield } from "lucide-react";

export default function PerformanceAnalytics({ userEmail }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("operativeAnalytics", { player_email: userEmail });
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading && !data) {
    return (
      <DataCard title="Performance Analytics">
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-[10px] text-muted-foreground tracking-widest animate-pulse">
            ARTEMIS PROCESSING FIELD DATA...
          </span>
        </div>
      </DataCard>
    );
  }

  if (error) {
    return (
      <DataCard title="Performance Analytics">
        <div className="text-center py-6 space-y-2">
          <AlertTriangle className="h-5 w-5 text-destructive mx-auto" />
          <p className="text-[10px] text-destructive">Analysis failed: {error}</p>
          <Button size="sm" variant="outline" className="text-[9px] h-6" onClick={loadAnalytics}>
            RETRY
          </Button>
        </div>
      </DataCard>
    );
  }

  const { stats, assessment } = data || {};

  return (
    <DataCard
      title="Performance Analytics"
      headerRight={
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-primary" />
          <span className="text-[9px] text-primary tracking-wider">AI-RATED</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Overall Classification Banner */}
        {assessment?.overall_rating && (
          <div className="flex items-center justify-between border border-primary/20 bg-primary/5 rounded-sm p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <div>
                <span className="text-[10px] text-muted-foreground tracking-wider block">OPERATIVE CLASSIFICATION</span>
                <span className="text-sm font-bold text-primary font-display tracking-wider">
                  {assessment.overall_rating.classification || "UNCLASSIFIED"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-primary">
                {assessment.overall_rating.score}
              </span>
              <span className="text-[9px] text-muted-foreground block tracking-wider">
                {assessment.overall_rating.grade}
              </span>
            </div>
          </div>
        )}

        {/* Rating Gauges */}
        {assessment && (
          <div className="grid md:grid-cols-2 gap-3">
            {assessment.combat_efficiency && (
              <PerformanceRatingGauge
                label="Combat Efficiency"
                score={assessment.combat_efficiency.score}
                grade={assessment.combat_efficiency.grade}
                summary={assessment.combat_efficiency.summary}
              />
            )}
            {assessment.scavenging_reliability && (
              <PerformanceRatingGauge
                label="Scavenging Reliability"
                score={assessment.scavenging_reliability.score}
                grade={assessment.scavenging_reliability.grade}
                summary={assessment.scavenging_reliability.summary}
              />
            )}
          </div>
        )}

        {/* Raw Stats Grid */}
        {stats && <PerformanceStatsGrid stats={stats} />}

        {/* Risk Profile */}
        {assessment?.risk_profile && (
          <div className="border border-border rounded-sm p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-semibold text-accent uppercase tracking-widest font-display">Risk Profile</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{assessment.risk_profile}</p>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {assessment && (assessment.strengths?.length > 0 || assessment.weaknesses?.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {assessment.strengths?.length > 0 && (
              <div className="border border-primary/20 rounded-sm p-3">
                <span className="text-[9px] text-primary font-semibold uppercase tracking-widest block mb-2">Strengths</span>
                <div className="space-y-1">
                  {assessment.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-primary text-[10px] mt-0.5">+</span>
                      <span className="text-[10px] text-foreground">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {assessment.weaknesses?.length > 0 && (
              <div className="border border-destructive/20 rounded-sm p-3">
                <span className="text-[9px] text-destructive font-semibold uppercase tracking-widest block mb-2">Weaknesses</span>
                <div className="space-y-1">
                  {assessment.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-destructive text-[10px] mt-0.5">−</span>
                      <span className="text-[10px] text-foreground">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tactical Assessment */}
        {assessment?.tactical_assessment && (
          <div className="border border-border bg-secondary/20 rounded-sm p-3">
            <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest block mb-1.5">
              ARTEMIS Tactical Assessment
            </span>
            <p className="text-[10px] text-foreground leading-relaxed">{assessment.tactical_assessment}</p>
          </div>
        )}
      </div>
    </DataCard>
  );
}