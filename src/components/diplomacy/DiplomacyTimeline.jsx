import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import DataCard from "../terminal/DataCard";
import {
  Swords, Shield, Handshake, AlertTriangle, FileSignature,
  Undo2, Ban, CheckCircle, Loader2, Clock, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const actionConfig = {
  war_declared: { icon: Swords, label: "War Declared", color: "text-status-danger", bg: "border-status-danger/30 bg-status-danger/5" },
  ceasefire_signed: { icon: Shield, label: "Ceasefire", color: "text-accent", bg: "border-accent/30 bg-accent/5" },
  treaty_proposed: { icon: FileSignature, label: "Treaty Proposed", color: "text-primary", bg: "border-primary/30 bg-primary/5" },
  treaty_accepted: { icon: CheckCircle, label: "Treaty Signed", color: "text-status-ok", bg: "border-status-ok/30 bg-status-ok/5" },
  treaty_rejected: { icon: Ban, label: "Treaty Rejected", color: "text-status-danger", bg: "border-status-danger/30 bg-status-danger/5" },
  treaty_revoked: { icon: Undo2, label: "Treaty Revoked", color: "text-status-warn", bg: "border-status-warn/30 bg-status-warn/5" },
  status_changed: { icon: AlertTriangle, label: "Status Changed", color: "text-muted-foreground", bg: "border-border bg-card" },
  non_aggression_signed: { icon: Shield, label: "NAP Signed", color: "text-primary", bg: "border-primary/30 bg-primary/5" },
  alliance_formed: { icon: Handshake, label: "Alliance Formed", color: "text-status-ok", bg: "border-status-ok/30 bg-status-ok/5" },
  embargo_imposed: { icon: Ban, label: "Embargo", color: "text-orange-400", bg: "border-orange-400/30 bg-orange-400/5" },
  embargo_lifted: { icon: CheckCircle, label: "Embargo Lifted", color: "text-status-ok", bg: "border-status-ok/30 bg-status-ok/5" },
};

export default function DiplomacyTimeline({ factions }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [filterFaction, setFilterFaction] = useState("all");

  useEffect(() => {
    base44.functions.invoke("diplomacyActions", { action: "history" })
      .then(res => setLogs(res.data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const getFactionName = (id) => factions?.find(f => f.id === id)?.name || "Unknown";
  const getFactionColor = (id) => factions?.find(f => f.id === id)?.color || "#888";

  const filtered = logs.filter(l => {
    if (filterAction !== "all" && l.action !== filterAction) return false;
    if (filterFaction !== "all" && l.faction_a_id !== filterFaction && l.faction_b_id !== filterFaction) return false;
    return true;
  });

  const actionTypes = [...new Set(logs.map(l => l.action))];

  if (loading) {
    return (
      <DataCard title="Diplomacy History">
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      </DataCard>
    );
  }

  return (
    <DataCard
      title="Diplomatic Timeline"
      headerRight={
        <span className="text-[8px] text-muted-foreground">{filtered.length} events</span>
      }
    >
      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="flex-1 min-w-[120px]">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="h-7 text-[10px] bg-muted">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map(a => (
                <SelectItem key={a} value={a}>{actionConfig[a]?.label || a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <Select value={filterFaction} onValueChange={setFilterFaction}>
            <SelectTrigger className="h-7 text-[10px] bg-muted">
              <SelectValue placeholder="All factions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Factions</SelectItem>
              {factions.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-6">No diplomatic events recorded.</p>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
          
          {filtered.map((log, i) => {
            const config = actionConfig[log.action] || actionConfig.status_changed;
            const Icon = config.icon;
            return (
              <div key={log.id} className="relative flex items-start gap-3 py-1.5">
                <div className={`relative z-10 flex items-center justify-center h-[22px] w-[22px] rounded-full border ${config.bg}`}>
                  <Icon className={`h-3 w-3 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[7px] uppercase ${config.color}`}>
                      {config.label}
                    </Badge>
                    <span className="text-[9px] font-semibold" style={{ color: getFactionColor(log.faction_a_id) }}>
                      {getFactionName(log.faction_a_id)}
                    </span>
                    <span className="text-[8px] text-muted-foreground">↔</span>
                    <span className="text-[9px] font-semibold" style={{ color: getFactionColor(log.faction_b_id) }}>
                      {getFactionName(log.faction_b_id)}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{log.description}</p>
                  {log.old_status && log.new_status && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[7px]">{log.old_status.replace("_", " ")}</Badge>
                      <span className="text-[7px] text-muted-foreground">→</span>
                      <Badge variant="outline" className="text-[7px]">{log.new_status.replace("_", " ")}</Badge>
                    </div>
                  )}
                  <span className="text-[8px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                    <Clock className="h-2.5 w-2.5" /> {moment(log.created_date).fromNow()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DataCard>
  );
}