import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Handshake } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import GuidanceBox from "../terminal/GuidanceBox";
import useGameCatalog from "@/hooks/useGameCatalog";
import TradeLineItemsEditor from "./TradeLineItemsEditor";

export default function CreateTradeRequest({ userEmail, userCallsign, items: rawItems = [], prefill, onCreated }) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const [players, setPlayers] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [offeredItems, setOfferedItems] = useState([]);
  const [offeredCredits, setOfferedCredits] = useState(0);
  const [requestedItems, setRequestedItems] = useState([]);
  const [requestedCredits, setRequestedCredits] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { data: gameItems = [] } = useGameCatalog();

  useEffect(() => {
    base44.entities.User.list("-created_date", 100)
      .then((users) => setPlayers((users || []).filter((user) => user?.email && user.email !== userEmail)))
      .catch(() => setPlayers([]));
  }, [userEmail]);

  useEffect(() => {
    if (!prefill || players.length === 0) {
      return;
    }

    const match = players.find((player) => player.email === prefill.receiverEmail);
    if (match) {
      setReceiverId(match.id);
    }
    setOfferedItems(Array.isArray(prefill.offeredItems) ? prefill.offeredItems : []);
    setRequestedItems(Array.isArray(prefill.requestedItems) ? prefill.requestedItems : []);
    setOfferedCredits(prefill.offeredCredits || 0);
    setRequestedCredits(prefill.requestedCredits || 0);
  }, [prefill, players]);

  const submit = async (event) => {
    event.preventDefault();
    if (!receiverId) {
      return;
    }
    const receiver = players.find((player) => player.id === receiverId);
    if (!receiver) {
      return;
    }

    const hasOffer = offeredItems.length > 0 || offeredCredits > 0;
    const hasRequest = requestedItems.length > 0 || requestedCredits > 0;
    if (!hasOffer && !hasRequest) {
      toast({ title: "Invalid Trade", description: "Must offer or request something.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await base44.functions.invoke("tradeOps", {
        action: "create_request",
        receiver_email: receiver.email,
        offered_items: offeredItems,
        requested_items: requestedItems,
        offered_credits: offeredCredits,
        requested_credits: requestedCredits,
        message: message.trim(),
      });

      toast({ title: "Trade Proposal Sent", description: `Sent to ${receiver.callsign || receiver.full_name || receiver.email}` });
      setReceiverId("");
      setOfferedItems([]);
      setRequestedItems([]);
      setOfferedCredits(0);
      setRequestedCredits(0);
      setMessage("");
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <GuidanceBox icon={Handshake} title="Direct Trade Proposal">
        Send a private, structured offer to another operative. Both sides use catalog-backed items so requests can be matched reliably across the app.
      </GuidanceBox>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Send To</Label>
        <Select value={receiverId} onValueChange={setReceiverId}>
          <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5">
            <SelectValue placeholder="Select operative..." />
          </SelectTrigger>
          <SelectContent>
            {players.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                {player.callsign || player.full_name || player.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-3 border border-primary/20 bg-primary/5 p-3">
          <div className="text-[9px] text-primary font-mono uppercase tracking-wider font-semibold">You Offer</div>
          <TradeLineItemsEditor
            label="Offered Items"
            catalog={gameItems}
            inventory={items}
            allowInventory
            value={offeredItems}
            onChange={setOfferedItems}
            emptyLabel="Optional barter items."
          />
          <div>
            <Label className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Offered Credits</Label>
            <Input
              type="number"
              min={0}
              value={offeredCredits}
              onChange={(event) => setOfferedCredits(Math.max(0, parseInt(event.target.value, 10) || 0))}
              className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
            />
          </div>
        </div>

        <div className="space-y-3 border border-accent/20 bg-accent/5 p-3">
          <div className="text-[9px] text-accent font-mono uppercase tracking-wider font-semibold">You Want</div>
          <TradeLineItemsEditor
            label="Requested Items"
            catalog={gameItems}
            value={requestedItems}
            onChange={setRequestedItems}
            emptyLabel="Optional if you only want credits."
          />
          <div>
            <Label className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Requested Credits</Label>
            <Input
              type="number"
              min={0}
              value={requestedCredits}
              onChange={(event) => setRequestedCredits(Math.max(0, parseInt(event.target.value, 10) || 0))}
              className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Message (optional)</Label>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={`Message from ${userCallsign || "Operative"}...`}
          className="text-[10px] bg-secondary/50 border-border font-mono mt-0.5 min-h-[40px]"
          rows={2}
        />
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={saving || !receiverId}
        className="w-full font-mono text-[10px] uppercase tracking-wider h-7"
      >
        <Send className="h-3 w-3 mr-1" />
        {saving ? "SENDING..." : "SEND TRADE PROPOSAL"}
      </Button>
    </form>
  );
}
