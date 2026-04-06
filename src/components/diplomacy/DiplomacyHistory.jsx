import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import {
  Swords, Shield, Handshake, AlertTriangle, FileSignature,
  Undo2, Ban, CheckCircle, Loader2, Clock,
} from "lucide-react";
import moment from "moment";

const actionConfig = {
  war_declared: { icon: Swords, color: "text-status-danger", bg: "bg-status-danger/10" },
  ceasefire_signed: { icon: Shield, color: "text-accent", bg: "bg-accent/10" },
  treaty_proposed: { icon: FileSignature, color: "text-primary", bg: "bg-primary/10" },
  treaty_accepted: { icon: CheckCircle, color: "text-status-ok", bg: "bg-status-ok/10" },
  treaty_rejected: { icon: Ban, color: "text-status-danger", bg: "bg-status-danger/10" },
  treaty_revoked: { icon: Undo2, color: "text-status-warn", bg: "bg-status-warn/10" },
  status_changed: { icon: AlertTriangle, color: "text-muted-foreground", bg: "bg-muted" },
  non_aggression_signed: { icon: Shield, color: "text-primary", bg: "bg-primary/10" },
  alliance_formed: { icon: Handshake, color: "text-status-ok", bg: "bg-status-ok/10" },
  embargo_imposed: { icon: Ban, color: "text-orange-400", bg: "bg-orange-400/10" },
  embargo_lifted: { icon: CheckCircle, color: "text-status-ok", bg: "bg-status-ok/10" },
};

export default function DiplomacyHistory({ factionAId, factionBId, factions }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("diplomacyActions", {
      action: "history",
      faction_a_id: factionAId,
      faction_b_id: factionBId,
    }).then(res => {
      setLogs(res.data.logs || []);
    }).catch(() => {
      setLogs([]);
    }).finally(() => setLoading(false));
  }, [factionAId, factionBId]);

  const getFactionName = (id) => factions?.find(f => f.id === id)?.name || "Unknown";

  if (loading) {
    return <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>;
  }

  if (logs.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground text-center py-3">
        No diplomatic history recorded.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <h4 className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
        Diplomatic History
      </h4>
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {logs.map(log => {
          const config = actionConfig[log.action] || actionConfig.status_changed;
          const Icon = config.icon;
          return (
            <div key={log.id} className={`flex items-start gap-2 px-2 py-1.5 rounded-sm ${config.bg}`}>
              <Icon className={`h-3 w-3 shrink-0 mt-0.5 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-foreground">{log.description}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                  {log.old_status && log.new_status && (
                    <span>
                      {log.old_status.replace("_", " ")} → {log.new_status.replace("_", " ")}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {moment(log.created_date).fromNow()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}