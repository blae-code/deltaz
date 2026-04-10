import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import DataCard from "../terminal/DataCard";
import TerminalLoader from "../terminal/TerminalLoader";
import TradeRequestCard from "./TradeRequestCard";
import EmptyState from "../terminal/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox, Send } from "lucide-react";

export default function TradeRequestList({ userEmail, userInventory = [], userCredits = 0 }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("incoming");

  const loadRequests = async () => {
    const [incoming, outgoing] = await Promise.all([
      base44.entities.TradeRequest.filter({ receiver_email: userEmail }, "-created_date", 50),
      base44.entities.TradeRequest.filter({ sender_email: userEmail }, "-created_date", 50),
    ]);
    setRequests([...incoming, ...outgoing]);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
    const unsub = base44.entities.TradeRequest.subscribe((event) => {
      if (event.type === "create") {
        if (event.data.receiver_email === userEmail || event.data.sender_email === userEmail) {
          setRequests(prev => [event.data, ...prev]);
        }
      } else if (event.type === "update") {
        setRequests(prev => prev.map(r => r.id === event.id ? event.data : r));
      } else if (event.type === "delete") {
        setRequests(prev => prev.filter(r => r.id !== event.id));
      }
    });
    return unsub;
  }, [userEmail]);

  if (loading) {
    return <TerminalLoader size="sm" messages={["LOADING PROPOSALS...", "QUERYING TRADE REQUESTS...", "SYNCING INBOX..."]} />;
  }

  const incoming = requests.filter(r => r.receiver_email === userEmail);
  const outgoing = requests.filter(r => r.sender_email === userEmail);
  const displayed = view === "incoming" ? incoming : outgoing;
  const pendingIn = incoming.filter(r => r.status === "pending").length;
  const active = displayed.filter(r => r.status === "pending");
  const resolved = displayed.filter(r => r.status !== "pending");

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Button
          variant={view === "incoming" ? "default" : "outline"}
          size="sm"
          className="text-[10px] uppercase tracking-wider h-7"
          onClick={() => setView("incoming")}
        >
          <Inbox className="h-3 w-3 mr-1" /> INCOMING
          {pendingIn > 0 && (
            <Badge className="ml-1.5 h-4 px-1 text-[8px] bg-accent text-accent-foreground">{pendingIn}</Badge>
          )}
        </Button>
        <Button
          variant={view === "outgoing" ? "default" : "outline"}
          size="sm"
          className="text-[10px] uppercase tracking-wider h-7"
          onClick={() => setView("outgoing")}
        >
          <Send className="h-3 w-3 mr-1" /> OUTGOING
        </Button>
      </div>

      {active.length > 0 && (
        <DataCard title={`Pending (${active.length})`}>
          <div className="space-y-2">
            {active.map(r => (
              <TradeRequestCard
                key={r.id}
                trade={r}
                userEmail={userEmail}
                userInventory={userInventory}
                userCredits={userCredits}
                onUpdate={loadRequests}
              />
            ))}
          </div>
        </DataCard>
      )}

      {resolved.length > 0 && (
        <DataCard title={`History (${resolved.length})`}>
          <div className="space-y-2">
            {resolved.map(r => (
              <TradeRequestCard
                key={r.id}
                trade={r}
                userEmail={userEmail}
                userInventory={userInventory}
                userCredits={userCredits}
                onUpdate={loadRequests}
              />
            ))}
          </div>
        </DataCard>
      )}

      {displayed.length === 0 && (
        view === "incoming" ? (
          <EmptyState
            icon={Inbox}
            title="No Incoming Proposals"
            why="No one has sent you a trade request yet."
            action="Make sure other players know your callsign, or post on the Trade Board so they can find you."
          />
        ) : (
          <EmptyState
            icon={Send}
            title="No Outgoing Proposals"
            why="You haven't sent any trade proposals yet."
            action="Hit NEW PROPOSAL above to send a private trade offer to another operative."
          />
        )
      )}
    </div>
  );
}
