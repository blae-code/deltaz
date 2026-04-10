import { useState } from "react";
import { sendServerBroadcast } from "@/api/serverApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Megaphone, Loader2 } from "lucide-react";

export default function ServerBroadcast() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleBroadcast = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await sendServerBroadcast(message);
      toast({ title: "Broadcast sent" });
      setMessage("");
    } catch (err) {
      toast({ title: "Broadcast failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-border bg-card rounded-sm p-4">
      <h3 className="text-xs font-mono text-muted-foreground tracking-widest mb-3 uppercase">
        Server Broadcast
      </h3>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message to broadcast to all players..."
        className="font-mono text-xs bg-muted mb-3 resize-none"
        rows={3}
        maxLength={200}
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">
          {message.length}/200
        </span>
        <Button
          size="sm"
          className="text-[10px] font-mono uppercase tracking-wider h-8"
          onClick={handleBroadcast}
          disabled={sending || !message.trim()}
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Megaphone className="h-3.5 w-3.5 mr-1" />
          )}
          TRANSMIT
        </Button>
      </div>
    </div>
  );
}
