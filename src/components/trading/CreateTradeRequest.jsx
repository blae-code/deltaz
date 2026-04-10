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

// SAFETY: Creates TradeRequest records.
// Schema requires: sender_email, receiver_email, status.
// Optional: sender_callsign, receiver_callsign, offer_items, offer_credits, request_items,
//   request_credits, message, expires_at.
export default function CreateTradeRequest({ userEmail, userCallsign, items: rawItems = [], prefill, onCreated }) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const [players, setPlayers] = useState([]);
  const [receiverId, setReceiverId] = useState("");

  // Offer side
  const [offerPickedItemId, setOfferPickedItemId] = useState("none");
  const [offerPickedQty, setOfferPickedQty] = useState(1);
  const [offerFreeText, setOfferFreeText] = useState("");
  const [offerCredits, setOfferCredits] = useState(0);

  // Request side
  const [requestItems, setRequestItems] = useState("");
  const [requestCredits, setRequestCredits] = useState(0);

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const tradableItems = items.filter(i => i?.name && !i.is_equipped && (i.quantity || 1) > 0);
  const pickedItem = offerPickedItemId && offerPickedItemId !== "none"
    ? items.find(i => i.id === offerPickedItemId)
    : null;

  useEffect(() => {
    base44.entities.User.list("-created_date", 100)
      .then(users => setPlayers((users || []).filter(u => u?.email && u.email !== userEmail)))
      .catch(() => setPlayers([]));
  }, [userEmail]);

  // Apply prefill once players have loaded
  useEffect(() => {
    if (!prefill || players.length === 0) return;
    const match = players.find(p => p.email === prefill.receiverEmail);
    if (match) setReceiverId(match.id);
    if (prefill.requestItems) setRequestItems(prefill.requestItems);
    if (prefill.requestCredits) setRequestCredits(prefill.requestCredits);
    if (prefill.offerItems) setOfferFreeText(prefill.offerItems);
  }, [prefill, players]);

  const buildOfferItems = () => {
    const parts = [];
    if (pickedItem) parts.push(`${offerPickedQty > 1 ? `${offerPickedQty}x ` : ""}${pickedItem.name}`);
    if (offerFreeText.trim()) parts.push(offerFreeText.trim());
    return parts.join(", ");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!receiverId) return;
    const receiver = players.find(p => p.id === receiverId);
    if (!receiver) return;

    const offerItemsStr = buildOfferItems();
    const hasOffer = offerItemsStr || offerCredits > 0;
    const hasRequest = requestItems.trim() || requestCredits > 0;
    if (!hasOffer && !hasRequest) {
      toast({ title: "Invalid Trade", description: "Must offer or request something.", variant: "destructive" });
      return;
    }

    setSaving(true);
    await base44.entities.TradeRequest.create({
      sender_email: userEmail,
      sender_callsign: userCallsign,
      receiver_email: receiver.email,
      receiver_callsign: receiver.callsign || receiver.full_name || "Operative",
      offer_items: offerItemsStr,
      offer_credits: offerCredits,
      request_items: requestItems.trim(),
      request_credits: requestCredits,
      message: message.trim(),
      status: "pending",
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });

    toast({ title: "Trade Proposal Sent", description: `Sent to ${receiver.callsign || "Operative"}` });
    setOfferPickedItemId("none");
    setOfferPickedQty(1);
    setOfferFreeText("");
    setOfferCredits(0);
    setRequestItems("");
    setRequestCredits(0);
    setMessage("");
    setReceiverId("");
    setSaving(false);
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <GuidanceBox icon={Handshake} title="Direct Trade Proposal">
        Send a private offer to another operative. Specify what you're offering and what you want in return.
        They'll have 48 hours to accept, counter, or decline.
      </GuidanceBox>

      {/* Recipient */}
      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Send To</Label>
        <Select value={receiverId} onValueChange={setReceiverId}>
          <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5">
            <SelectValue placeholder="Select operative..." />
          </SelectTrigger>
          <SelectContent>
            {players.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.callsign || p.full_name || p.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* You Offer */}
        <div className="space-y-2 border border-primary/20 bg-primary/5 p-2.5">
          <p className="text-[9px] text-primary font-mono uppercase tracking-wider font-semibold">You Offer</p>

          {/* Gear locker picker */}
          {tradableItems.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[8px] uppercase text-muted-foreground font-mono">From Gear Locker</Label>
              <Select value={offerPickedItemId} onValueChange={v => { setOfferPickedItemId(v); setOfferPickedQty(1); }}>
                <SelectTrigger className="h-6 text-[9px] bg-secondary/50 border-border font-mono">
                  <SelectValue placeholder="Pick item..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— none —</SelectItem>
                  {tradableItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} x{i.quantity || 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pickedItem && (
                <Input
                  type="number" min={1} max={pickedItem.quantity || 1}
                  value={offerPickedQty}
                  onChange={e => setOfferPickedQty(parseInt(e.target.value) || 1)}
                  className="h-5 text-[9px] bg-secondary/50 border-border font-mono"
                  placeholder="Qty"
                />
              )}
            </div>
          )}

          {/* Free-text items */}
          <div>
            <Label className="text-[8px] uppercase text-muted-foreground font-mono">
              {tradableItems.length > 0 ? "Other Items" : "Items"}
            </Label>
            <Input
              value={offerFreeText}
              onChange={e => setOfferFreeText(e.target.value)}
              placeholder="e.g. 10x Scrap Metal"
              className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
            />
          </div>

          <div>
            <Label className="text-[8px] uppercase text-muted-foreground font-mono">Credits</Label>
            <Input
              type="number" min={0} value={offerCredits}
              onChange={e => setOfferCredits(parseInt(e.target.value) || 0)}
              className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
            />
          </div>
        </div>

        {/* You Want */}
        <div className="space-y-2 border border-accent/20 bg-accent/5 p-2.5">
          <p className="text-[9px] text-accent font-mono uppercase tracking-wider font-semibold">You Want</p>
          <div>
            <Label className="text-[8px] uppercase text-muted-foreground font-mono">Items</Label>
            <Input
              value={requestItems}
              onChange={e => setRequestItems(e.target.value)}
              placeholder="e.g. 5x Ammo, Fuel Can"
              className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
            />
          </div>
          <div>
            <Label className="text-[8px] uppercase text-muted-foreground font-mono">Credits</Label>
            <Input
              type="number" min={0} value={requestCredits}
              onChange={e => setRequestCredits(parseInt(e.target.value) || 0)}
              className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Message (optional)</Label>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Hey, I need this for..."
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
