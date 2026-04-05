import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Check, X, Clock, Loader2 } from "lucide-react";
import moment from "moment";

const urgencyStyles = {
  low: "text-muted-foreground border-border",
  medium: "text-accent border-accent/30",
  high: "text-orange-400 border-orange-400/30",
  critical: "text-status-danger border-status-danger/30",
};

const statusStyles = {
  pending: "bg-accent/10 text-accent",
  approved: "bg-status-ok/10 text-status-ok",
  denied: "bg-status-danger/10 text-status-danger",
  fulfilled: "bg-primary/10 text-primary",
  expired: "bg-muted text-muted-foreground",
};

const aidTypeLabels = {
  military: "Military",
  supplies: "Supplies",
  medical: "Medical",
  intelligence: "Intel",
  engineering: "Engineering",
};

export default function AidRequestList({ requests, factions, userFactionIds, onUpdate }) {
  const [respondingId, setRespondingId] = useState(null);
  const [responseMsg, setResponseMsg] = useState("");
  const [acting, setActing] = useState(null);
  const { toast } = useToast();

  const respond = async (req, newStatus) => {
    setActing(req.id + newStatus);
    await base44.entities.AidRequest.update(req.id, {
      status: newStatus,
      response_message: responseMsg || undefined,
    });
    toast({ title: `Aid request ${newStatus}` });
    setRespondingId(null);
    setResponseMsg("");
    setActing(null);
    onUpdate?.();
  };

  const getFaction = (id) => factions.find(f => f.id === id);

  if (requests.length === 0) {
    return <p className="text-[10px] text-muted-foreground text-center py-4">No aid requests.</p>;
  }

  return (
    <div className="space-y-2">
      {requests.map(req => {
        const from = getFaction(req.requester_faction_id);
        const to = getFaction(req.target_faction_id);
        const canRespond = userFactionIds.includes(req.target_faction_id) && req.status === "pending";

        return (
          <div key={req.id} className="border border-border rounded-sm p-3 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[8px] uppercase ${urgencyStyles[req.urgency]}`}>
                    {req.urgency}
                  </Badge>
                  <Badge variant="outline" className="text-[8px] uppercase">
                    {aidTypeLabels[req.aid_type] || req.aid_type}
                  </Badge>
                  <Badge className={`text-[8px] uppercase border-0 ${statusStyles[req.status]}`}>
                    {req.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
                  <span className="font-semibold" style={{ color: from?.color }}>{from?.name}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold" style={{ color: to?.color }}>{to?.name}</span>
                </div>
              </div>
              <span className="text-[8px] text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" /> {moment(req.created_date).fromNow()}
              </span>
            </div>

            <p className="text-xs text-foreground mt-2">{req.message}</p>

            {req.response_message && (
              <div className="mt-2 border-t border-border/50 pt-2">
                <p className="text-[9px] text-muted-foreground tracking-wider uppercase mb-0.5">RESPONSE</p>
                <p className="text-xs text-foreground">{req.response_message}</p>
              </div>
            )}

            {canRespond && respondingId !== req.id && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="text-[9px] h-6 flex-1" onClick={() => respond(req, "approved")} disabled={!!acting}>
                  <Check className="h-3 w-3 mr-1" /> APPROVE
                </Button>
                <Button variant="outline" size="sm" className="text-[9px] h-6" onClick={() => setRespondingId(req.id)}>
                  REPLY
                </Button>
                <Button variant="destructive" size="sm" className="text-[9px] h-6" onClick={() => respond(req, "denied")} disabled={!!acting}>
                  <X className="h-3 w-3 mr-1" /> DENY
                </Button>
              </div>
            )}

            {respondingId === req.id && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={responseMsg}
                  onChange={e => setResponseMsg(e.target.value)}
                  placeholder="Response message..."
                  className="text-xs bg-secondary/50"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="text-[9px] h-6 flex-1" onClick={() => respond(req, "approved")} disabled={!!acting}>
                    {acting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} APPROVE & REPLY
                  </Button>
                  <Button variant="destructive" size="sm" className="text-[9px] h-6" onClick={() => respond(req, "denied")} disabled={!!acting}>
                    DENY
                  </Button>
                  <Button variant="ghost" size="sm" className="text-[9px] h-6" onClick={() => setRespondingId(null)}>
                    CANCEL
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}