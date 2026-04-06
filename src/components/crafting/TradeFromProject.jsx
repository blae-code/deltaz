import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DataCard from "../terminal/DataCard";

export default function TradeFromProject({ shortfalls, projectTitle, userEmail, userCallsign, onDone }) {
  const [mode, setMode] = useState("trade_post"); // trade_post | p2p
  const [players, setPlayers] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [offerItems, setOfferItems] = useState("");
  const [offerCredits, setOfferCredits] = useState(0);
  const [message, setMessage] = useState("");
  const [sector, setSector] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.User.list("-created_date", 100).then(users => {
      setPlayers(users.filter(u => u.email !== userEmail));
    });
  }, [userEmail]);

  const requestDescription = shortfalls.map(s => `${s.deficit}x ${s.resource}`).join(", ");

  const postTradeOffer = async () => {
    if (!sector.trim()) {
      toast({ title: "Need Sector", description: "Enter your sector for trade visibility", variant: "destructive" });
      return;
    }
    setSaving(true);
    await base44.entities.TradeOffer.create({
      seller_email: userEmail,
      seller_callsign: userCallsign,
      item_name: `[WANTED] Materials for: ${projectTitle}`,
      item_category: "material",
      quantity: 1,
      asking_price: 0,
      asking_items: requestDescription,
      sector: sector.trim().toUpperCase(),
      status: "open",
    });
    toast({ title: "Trade Posted", description: "Material request posted to Trade Board" });
    setSaving(false);
    onDone?.();
  };

  const sendP2P = async () => {
    if (!receiverId) return;
    const receiver = players.find(p => p.id === receiverId);
    if (!receiver) return;

    setSaving(true);
    try {
      const res = await base44.functions.invoke("tradeRequestOps", {
        action: "create",
        receiver_user_id: receiverId,
        offer_items: offerItems.trim(),
        offer_credits: offerCredits,
        request_items: requestDescription,
        message: message.trim() || `Need materials for crafting project "${projectTitle}"`,
      });
      if (res.data?.error) {
        throw new Error(res.data.error);
      }

      toast({ title: "Trade Proposal Sent", description: `Sent to ${receiver.callsign || "Operative"}` });
      onDone?.();
    } catch (err) {
      toast({ title: "Trade proposal failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DataCard title="Source Missing Materials">
      <div className="space-y-3">
        {/* Show what's needed */}
        <div className="bg-secondary/30 border border-border/50 rounded-sm p-2">
          <p className="text-[8px] text-muted-foreground uppercase tracking-widest mb-1">REQUESTING:</p>
          <p className="text-[10px] font-mono text-accent font-semibold">{requestDescription}</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setMode("trade_post")}
            className={`text-[9px] uppercase tracking-wider font-mono px-2.5 py-1 rounded-sm transition-colors ${
              mode === "trade_post" ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground border border-transparent"
            }`}
          >
            <ShoppingCart className="h-3 w-3 inline mr-1" />Trade Board
          </button>
          <button
            onClick={() => setMode("p2p")}
            className={`text-[9px] uppercase tracking-wider font-mono px-2.5 py-1 rounded-sm transition-colors ${
              mode === "p2p" ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground border border-transparent"
            }`}
          >
            <Send className="h-3 w-3 inline mr-1" />Direct P2P
          </button>
        </div>

        {mode === "trade_post" && (
          <div className="space-y-2">
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Your Sector</Label>
              <Input
                value={sector}
                onChange={e => setSector(e.target.value)}
                placeholder="e.g. B-3"
                className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
              />
            </div>
            <Button onClick={postTradeOffer} disabled={saving} size="sm" className="w-full h-7 text-[10px] font-mono uppercase tracking-wider">
              <ShoppingCart className="h-3 w-3 mr-1" /> {saving ? "POSTING..." : "POST TO TRADE BOARD"}
            </Button>
          </div>
        )}

        {mode === "p2p" && (
          <div className="space-y-2">
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[8px] uppercase text-muted-foreground font-mono">Offering Items</Label>
                <Input value={offerItems} onChange={e => setOfferItems(e.target.value)} placeholder="e.g. 5x Fuel" className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
              </div>
              <div>
                <Label className="text-[8px] uppercase text-muted-foreground font-mono">Offering Credits</Label>
                <Input type="number" min={0} value={offerCredits} onChange={e => setOfferCredits(parseInt(e.target.value) || 0)} className="h-6 text-[10px] bg-secondary/50 border-border font-mono mt-0.5" />
              </div>
            </div>
            <div>
              <Label className="text-[8px] uppercase text-muted-foreground font-mono">Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={`Need materials for "${projectTitle}"`} className="text-[10px] bg-secondary/50 border-border font-mono mt-0.5 min-h-[36px]" rows={2} />
            </div>
            <Button onClick={sendP2P} disabled={saving || !receiverId} size="sm" className="w-full h-7 text-[10px] font-mono uppercase tracking-wider">
              <Send className="h-3 w-3 mr-1" /> {saving ? "SENDING..." : "SEND TRADE PROPOSAL"}
            </Button>
          </div>
        )}
      </div>
    </DataCard>
  );
}
