import { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DataCard from "../terminal/DataCard";
import useGameCatalog from "@/hooks/useGameCatalog";
import { buildTradeLineItemFromCatalog } from "@/lib/gameCatalog";
import TradeLineItemsEditor from "../trading/TradeLineItemsEditor";

export default function TradeFromProject({ shortfalls, projectTitle, inventory = [], userEmail, userCallsign, onDone }) {
  const [mode, setMode] = useState("trade_post");
  const [players, setPlayers] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [offerItems, setOfferItems] = useState([]);
  const [offerCredits, setOfferCredits] = useState(0);
  const [message, setMessage] = useState("");
  const [sector, setSector] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { data: gameItems = [] } = useGameCatalog();

  useEffect(() => {
    base44.entities.User.list("-created_date", 100).then((users) => {
      setPlayers((users || []).filter((user) => user.email !== userEmail));
    });
  }, [userEmail]);

  const requestedItems = useMemo(
    () => (Array.isArray(shortfalls) ? shortfalls : []).map((shortfall) => {
      const catalogItem = gameItems.find((item) => item.slug === shortfall.game_item_slug) || null;
      return buildTradeLineItemFromCatalog(
        catalogItem || { slug: shortfall.game_item_slug, name: shortfall.resource, inventory_category: "material" },
        shortfall.deficit,
        { name: shortfall.resource, game_item_slug: shortfall.game_item_slug, inventory_category: "material" },
      );
    }),
    [shortfalls, gameItems],
  );

  const requestDescription = requestedItems.map((item) => `${item.quantity}x ${item.name}`).join(", ");

  const postTradeOffer = async () => {
    if (!sector.trim()) {
      toast({ title: "Need Sector", description: "Enter your sector for trade visibility", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke("tradeOps", {
        action: "create_listing",
        listing_type: "want",
        sector: sector.trim().toUpperCase(),
        requested_items: requestedItems,
        offered_items: offerItems,
        offered_credits: offerCredits,
      });
      toast({ title: "Trade Posted", description: "Material request posted to Trade Board" });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  const sendP2P = async () => {
    if (!receiverId) {
      return;
    }
    const receiver = players.find((player) => player.id === receiverId);
    if (!receiver) {
      return;
    }

    setSaving(true);
    try {
      await base44.functions.invoke("tradeOps", {
        action: "create_request",
        receiver_email: receiver.email,
        offered_items: offerItems,
        offered_credits: offerCredits,
        requested_items: requestedItems,
        message: message.trim() || `Need materials for crafting project "${projectTitle}"`,
      });
      toast({ title: "Trade Proposal Sent", description: `Sent to ${receiver.callsign || receiver.full_name || receiver.email}` });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DataCard title="Source Missing Materials">
      <div className="space-y-3">
        <div className="bg-secondary/30 border border-border/50 rounded-sm p-2">
          <p className="text-[8px] text-muted-foreground uppercase tracking-widest mb-1">REQUESTING:</p>
          <p className="text-[10px] font-mono text-accent font-semibold">{requestDescription}</p>
        </div>

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

        <TradeLineItemsEditor
          label="What You Can Offer"
          catalog={gameItems}
          inventory={inventory}
          allowInventory
          value={offerItems}
          onChange={setOfferItems}
          emptyLabel="Optional barter items."
        />

        <div>
          <Label className="text-[8px] uppercase tracking-wider text-muted-foreground font-mono">Offered Credits</Label>
          <Input
            type="number"
            min={0}
            value={offerCredits}
            onChange={(event) => setOfferCredits(Math.max(0, parseInt(event.target.value, 10) || 0))}
            className="h-7 text-[10px] bg-secondary/50 border-border font-mono mt-0.5"
          />
        </div>

        {mode === "trade_post" && (
          <div className="space-y-2">
            <div>
              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Your Sector</Label>
              <Input
                value={sector}
                onChange={(event) => setSector(event.target.value)}
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
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.callsign || player.full_name || player.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[8px] uppercase text-muted-foreground font-mono">Message</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={`Need materials for "${projectTitle}"`}
                className="text-[10px] bg-secondary/50 border-border font-mono mt-0.5 min-h-[36px]"
                rows={2}
              />
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
