import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CreateTradeRequest({ userEmail, userCallsign, onCreated }) {
  const [players, setPlayers] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [offerItems, setOfferItems] = useState("");
  const [offerCredits, setOfferCredits] = useState(0);
  const [requestItems, setRequestItems] = useState("");
  const [requestCredits, setRequestCredits] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.User.list("-created_date", 100).then(users => {
      setPlayers(users.filter(u => u.email !== userEmail));
    });
  }, [userEmail]);

  const submit = async (e) => {
    e.preventDefault();
    if (!receiverId) return;

    const receiver = players.find(p => p.id === receiverId);
    if (!receiver) return;

    const hasOffer = offerItems.trim() || offerCredits > 0;
    const hasRequest = requestItems.trim() || requestCredits > 0;
    if (!hasOffer && !hasRequest) {
      toast({ title: "Invalid Trade", description: "Must offer or request something.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await base44.entities.TradeRequest.create({
      sender_email: userEmail,
      sender_callsign: userCallsign,
      receiver_email: receiver.email,
      receiver_callsign: receiver.callsign || receiver.full_name || "Operative",
      offer_items: offerItems.trim(),
      offer_credits: offerCredits,
      request_items: requestItems.trim(),
      request_credits: requestCredits,
      message: message.trim(),
      status: "pending",
      expires_at: expiresAt,
    });

    toast({ title: "Trade Proposal Sent", description: `Sent to ${receiver.callsign || "Operative"}` });
    setOfferItems(""); setOfferCredits(0); setRequestItems(""); setRequestCredits(0); setMessage(""); setReceiverId("");
    setSaving(false);
    onCreated?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
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
        <div className="space-y-2 border border-primary/20 bg-primary/5 rounded-sm p-2">
          <p className="text-[9px] text-primary font-mono uppercase tracking-wider font-semibold">You Offer</p>
          <div>
            <Label className="text-[8px] uppercase text-muted-foreground font-mono">Items</Label>
            <Input value={offerItems} onChange={e => setOfferItems(e.target.value)} placeholder="e.g. 10x Scrap Metal, MedKit" className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
          </div>
          <div>
            <Label className="text-[8px] uppercase text-muted-foreground font-mono">Credits</Label>
            <Input type="number" min={0} value={offerCredits} onChange={e => setOfferCredits(parseInt(e.target.value) || 0)} className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
          </div>
        </div>

        <div className="space-y-2 border border-accent/20 bg-accent/5 rounded-sm p-2">
          <p className="text-[9px] text-accent font-mono uppercase tracking-wider font-semibold">You Want</p>
          <div>
            <Label className="text-[8px] uppercase text-muted-foreground font-mono">Items</Label>
            <Input value={requestItems} onChange={e => setRequestItems(e.target.value)} placeholder="e.g. 5x Ammo, Fuel Can" className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
          </div>
          <div>
            <Label className="text-[8px] uppercase text-muted-foreground font-mono">Credits</Label>
            <Input type="number" min={0} value={requestCredits} onChange={e => setRequestCredits(parseInt(e.target.value) || 0)} className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Message (optional)</Label>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Hey, I need this for a mission..." className="text-[10px] bg-secondary/50 border-border font-mono mt-0.5 min-h-[40px]" rows={2} />
      </div>

      <Button type="submit" size="sm" disabled={saving || !receiverId} className="w-full font-mono text-[10px] uppercase tracking-wider h-7">
        <Send className="h-3 w-3 mr-1" /> {saving ? "SENDING..." : "SEND TRADE PROPOSAL"}
      </Button>
    </form>
  );
}